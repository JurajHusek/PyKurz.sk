"""enrollments tests submissions

Revision ID: 20260609_0003
Revises: 20260609_0002
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260609_0003"
down_revision: Union[str, None] = "20260609_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "student_id", name="uq_course_student"),
    )
    op.create_index(op.f("ix_course_enrollments_id"), "course_enrollments", ["id"], unique=False)

    op.create_table(
        "course_tests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("assignment", sa.Text(), nullable=False, server_default=""),
        sa.Column("starter_code", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_course_tests_id"), "course_tests", ["id"], unique=False)

    op.create_table(
        "test_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("test_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["test_id"], ["course_tests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("test_id", "student_id", name="uq_test_student_submission"),
    )
    op.create_index(op.f("ix_test_submissions_id"), "test_submissions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_test_submissions_id"), table_name="test_submissions")
    op.drop_table("test_submissions")
    op.drop_index(op.f("ix_course_tests_id"), table_name="course_tests")
    op.drop_table("course_tests")
    op.drop_index(op.f("ix_course_enrollments_id"), table_name="course_enrollments")
    op.drop_table("course_enrollments")
