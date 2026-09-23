"""Add exited_at and exited_by to gate_entry table.

Revision ID: 20260923_inbound_exit
Revises: 20260921_po_rfq_totals
Create Date: 2026-09-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_inbound_exit"
down_revision: Union[str, Sequence[str], None] = ("20260921_po_rfq_totals", "81d4f8688871")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return sa.inspect(op.get_bind())


def _column_exists(table_name: str, column_name: str) -> bool:
    return any(c["name"] == column_name for c in _inspector().get_columns(table_name))


def upgrade() -> None:
    if not _column_exists("gate_entry", "exited_at"):
        op.add_column(
            "gate_entry",
            sa.Column("exited_at", sa.DateTime(timezone=True), nullable=True),
        )

    if not _column_exists("gate_entry", "exited_by"):
        op.add_column(
            "gate_entry",
            sa.Column("exited_by", sa.String(length=128), nullable=True),
        )


def downgrade() -> None:
    if _column_exists("gate_entry", "exited_by"):
        op.drop_column("gate_entry", "exited_by")

    if _column_exists("gate_entry", "exited_at"):
        op.drop_column("gate_entry", "exited_at")
