from datetime import datetime

from pydantic import BaseModel, Field


class CoursePageBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    content: str = ""
    position: int = 0


class CoursePageCreate(CoursePageBase):
    pass


class CoursePageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    content: str | None = None
    position: int | None = None


class CoursePageRead(CoursePageBase):
    id: int
    course_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = ""
    is_published: bool = False


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    is_published: bool | None = None


class CourseRead(CourseBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EnrolledStudentRead(BaseModel):
    id: int
    email: str
    display_name: str
    enrolled_at: datetime


class CourseTestBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    assignment: str = ""
    starter_code: str = ""
    is_published: bool = False
    position: int = 0


class CourseTestCreate(CourseTestBase):
    pass


class CourseTestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    assignment: str | None = None
    starter_code: str | None = None
    is_published: bool | None = None
    position: int | None = None


class CourseTestRead(CourseTestBase):
    id: int
    course_id: int
    submitted: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TestSubmissionCreate(BaseModel):
    code: str = Field(min_length=1)
    files: dict[str, str] = {}


class TestSubmissionRead(BaseModel):
    id: int
    test_id: int
    student_id: int
    student_email: str | None = None
    student_name: str | None = None
    code: str
    files: dict[str, str] = {}
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseDetail(CourseRead):
    pages: list[CoursePageRead] = []
    tests: list[CourseTestRead] = []
    can_edit: bool = False
    is_enrolled: bool = False
