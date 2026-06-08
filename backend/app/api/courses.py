from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models.course import Course, CoursePage
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseDetail,
    CoursePageCreate,
    CoursePageRead,
    CoursePageUpdate,
    CourseRead,
    CourseUpdate,
)

router = APIRouter(prefix="/courses", tags=["courses"])


def ensure_owner(course: Course, user: User) -> None:
    if course.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only course owner can edit this course")


def get_visible_course(db: Session, course_id: int, user: User | None) -> Course:
    stmt = select(Course).options(selectinload(Course.pages)).where(Course.id == course_id)
    course = db.scalar(stmt)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if not course.is_published and (user is None or course.owner_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


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
    return CourseDetail.model_validate(course, from_attributes=True).model_copy(update={"can_edit": True})


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> CourseDetail:
    course = get_visible_course(db, course_id, current_user)
    can_edit = current_user is not None and course.owner_id == current_user.id
    return CourseDetail.model_validate(course, from_attributes=True).model_copy(update={"can_edit": can_edit})


@router.patch("/{course_id}", response_model=CourseDetail)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseDetail:
    course = get_visible_course(db, course_id, current_user)
    ensure_owner(course, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return CourseDetail.model_validate(course, from_attributes=True).model_copy(update={"can_edit": True})


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = get_visible_course(db, course_id, current_user)
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
    ensure_owner(course, current_user)
    page = db.get(CoursePage, page_id)
    if page is None or page.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    db.delete(page)
    db.commit()

