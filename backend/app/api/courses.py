import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models.course import Course, CourseEnrollment, CoursePage, CourseTest, TestSubmission
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseDetail,
    CourseTestCreate,
    CourseTestRead,
    CourseTestUpdate,
    EnrolledStudentRead,
    CoursePageCreate,
    CoursePageRead,
    CoursePageUpdate,
    CourseRead,
    CourseUpdate,
    TestSubmissionCreate,
    TestSubmissionRead,
)

router = APIRouter(prefix="/courses", tags=["courses"])


def ensure_owner(course: Course, user: User) -> None:
    if course.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only course owner can edit this course")


def ensure_teacher(user: User) -> None:
    if user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can browse courses but cannot create them")


def get_visible_course(db: Session, course_id: int, user: User | None) -> Course:
    stmt = select(Course).options(selectinload(Course.pages), selectinload(Course.tests)).where(Course.id == course_id)
    course = db.scalar(stmt)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if not course.is_published and (user is None or course.owner_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def is_enrolled(db: Session, course_id: int, user: User | None) -> bool:
    if user is None:
        return False
    if user.role == "teacher":
        return False
    stmt = select(CourseEnrollment).where(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.student_id == user.id,
    )
    return db.scalar(stmt) is not None


def course_detail_for(course: Course, user: User | None, db: Session) -> CourseDetail:
    can_edit = user is not None and course.owner_id == user.id and user.role == "teacher"
    enrolled = is_enrolled(db, course.id, user)
    tests = course.tests if can_edit else [test for test in course.tests if test.is_published and enrolled]
    submitted_test_ids: set[int] = set()
    if user is not None and user.role == "student" and tests:
        submitted_test_ids = set(
            db.scalars(
                select(TestSubmission.test_id).where(
                    TestSubmission.student_id == user.id,
                    TestSubmission.test_id.in_([test.id for test in tests]),
                )
            )
        )
    detail = CourseDetail.model_validate(course, from_attributes=True)
    return detail.model_copy(
        update={
            "can_edit": can_edit,
            "is_enrolled": enrolled,
            "tests": [
                CourseTestRead.model_validate(test, from_attributes=True).model_copy(
                    update={"submitted": test.id in submitted_test_ids}
                )
                for test in tests
            ],
        }
    )


def get_test_or_404(db: Session, course_id: int, test_id: int) -> CourseTest:
    test = db.get(CourseTest, test_id)
    if test is None or test.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")
    return test


@router.get("", response_model=list[CourseRead])
def list_courses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> list[Course]:
    visibility = [Course.is_published.is_(True)]
    if current_user is not None:
        visibility.append(Course.owner_id == current_user.id)
    stmt = select(Course).where(or_(*visibility)).order_by(Course.updated_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=CourseDetail, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseDetail:
    ensure_teacher(current_user)
    course = Course(**payload.model_dump(), owner_id=current_user.id)
    course.pages.append(
        CoursePage(
            title="Uvod",
            position=0,
            content="# Uvod\n\n```python\nprint('Ahoj z Pythonu')\n```",
        )
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course_detail_for(course, current_user, db)


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> CourseDetail:
    course = get_visible_course(db, course_id, current_user)
    return course_detail_for(course, current_user, db)


@router.patch("/{course_id}", response_model=CourseDetail)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseDetail:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return course_detail_for(course, current_user, db)


@router.post("/{course_id}/enroll", status_code=status.HTTP_204_NO_CONTENT)
def enroll_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can enroll")
    course = get_visible_course(db, course_id, current_user)
    if not course.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if not is_enrolled(db, course.id, current_user):
        db.add(CourseEnrollment(course_id=course.id, student_id=current_user.id))
        db.commit()


@router.get("/{course_id}/students", response_model=list[EnrolledStudentRead])
def list_students(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[EnrolledStudentRead]:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    stmt = (
        select(CourseEnrollment, User)
        .join(User, User.id == CourseEnrollment.student_id)
        .where(CourseEnrollment.course_id == course.id)
        .order_by(CourseEnrollment.created_at.desc())
    )
    return [
        EnrolledStudentRead(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            enrolled_at=enrollment.created_at,
        )
        for enrollment, user in db.execute(stmt).all()
    ]


@router.delete("/{course_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_student(
    course_id: int,
    student_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    enrollment = db.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.student_id == student_id,
        )
    )
    if enrollment is not None:
        db.delete(enrollment)
        db.commit()


@router.post("/{course_id}/tests", response_model=CourseTestRead, status_code=status.HTTP_201_CREATED)
def create_test(
    course_id: int,
    payload: CourseTestCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseTest:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    test = CourseTest(course_id=course.id, **payload.model_dump())
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.patch("/{course_id}/tests/{test_id}", response_model=CourseTestRead)
def update_test(
    course_id: int,
    test_id: int,
    payload: CourseTestUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseTest:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    test = get_test_or_404(db, course.id, test_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(test, key, value)
    db.commit()
    db.refresh(test)
    return test


@router.delete("/{course_id}/tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(
    course_id: int,
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    test = get_test_or_404(db, course.id, test_id)
    db.delete(test)
    db.commit()


@router.post("/{course_id}/tests/{test_id}/submit", response_model=TestSubmissionRead)
def submit_test(
    course_id: int,
    test_id: int,
    payload: TestSubmissionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TestSubmissionRead:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit tests")
    course = get_visible_course(db, course_id, current_user)
    test = get_test_or_404(db, course.id, test_id)
    if not test.is_published:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This test is not accepting submissions")
    if not is_enrolled(db, course.id, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Enroll in the course before submitting")
    submission = db.scalar(
        select(TestSubmission).where(
            TestSubmission.test_id == test.id,
            TestSubmission.student_id == current_user.id,
        )
    )
    if submission is None:
        submission = TestSubmission(
            test_id=test.id,
            student_id=current_user.id,
            code=payload.code,
            files_json=json.dumps(payload.files),
        )
        db.add(submission)
    else:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This test has already been submitted")
    db.commit()
    db.refresh(submission)
    return TestSubmissionRead.model_validate(submission, from_attributes=True).model_copy(
        update={
            "student_email": current_user.email,
            "student_name": current_user.display_name,
            "files": json.loads(submission.files_json or "{}"),
        }
    )


@router.get("/{course_id}/tests/{test_id}/submissions", response_model=list[TestSubmissionRead])
def list_submissions(
    course_id: int,
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TestSubmissionRead]:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    test = get_test_or_404(db, course.id, test_id)
    stmt = (
        select(TestSubmission, User)
        .join(User, User.id == TestSubmission.student_id)
        .where(TestSubmission.test_id == test.id)
        .order_by(TestSubmission.updated_at.desc())
    )
    return [
        TestSubmissionRead.model_validate(submission, from_attributes=True).model_copy(
            update={
                "student_email": user.email,
                "student_name": user.display_name,
                "files": json.loads(submission.files_json or "{}"),
            }
        )
        for submission, user in db.execute(stmt).all()
    ]


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    db.delete(course)
    db.commit()


@router.post("/{course_id}/pages", response_model=CoursePageRead, status_code=status.HTTP_201_CREATED)
def create_page(
    course_id: int,
    payload: CoursePageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CoursePage:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    page = CoursePage(course_id=course.id, **payload.model_dump())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


@router.patch("/{course_id}/pages/{page_id}", response_model=CoursePageRead)
def update_page(
    course_id: int,
    page_id: int,
    payload: CoursePageUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CoursePage:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    page = db.get(CoursePage, page_id)
    if page is None or page.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(page, key, value)
    db.commit()
    db.refresh(page)
    return page


@router.delete("/{course_id}/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    course_id: int,
    page_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = get_visible_course(db, course_id, current_user)
    ensure_teacher(current_user)
    ensure_owner(course, current_user)
    page = db.get(CoursePage, page_id)
    if page is None or page.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    db.delete(page)
    db.commit()
