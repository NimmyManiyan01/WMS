"""Persist deduplicated custom UOMs for finished-goods requests.

Revision ID: 20261104_finished_goods_custom_uom
Revises: 20261104_remove_legacy_supplier
Create Date: 2026-11-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261104_finished_goods_custom_uom"
down_revision = "20261104_remove_legacy_supplier"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "finished_goods_uom_option",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("normalized_code", sa.String(length=32), nullable=False),
        sa.Column("created_by", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("normalized_code", name="uq_finished_goods_uom_normalized_code"),
    )
    op.create_index(
        "ix_finished_goods_uom_option_normalized_code",
        "finished_goods_uom_option",
        ["normalized_code"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_finished_goods_uom_option_normalized_code",
        table_name="finished_goods_uom_option",
    )
    op.drop_table("finished_goods_uom_option")
