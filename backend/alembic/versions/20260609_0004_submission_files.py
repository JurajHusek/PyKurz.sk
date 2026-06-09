"""submission files

Revision ID: 20260609_0004
Revises: 20260609_0003
Create Date: 2026-06-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260609_0004"
down_revision: Union[str, None] = "20260609_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("test_submissions", sa.Column("files_json", sa.Text(), nullable=False, server_default="{}"))


def downgrade() -> None:
    op.drop_column("test_submissions", "files_json")
