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


class CourseDetail(CourseRead):
    pages: list[CoursePageRead] = []
    can_edit: bool = False

