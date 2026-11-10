"""Manage standard and user-added finished-goods UOMs uniformly.

Revision ID: 20261104_manage_all_fg_uoms
Revises: 20261104_finished_goods_custom_uom
Create Date: 2026-11-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20261104_manage_all_fg_uoms"
down_revision = "20261104_finished_goods_custom_uom"
branch_labels = None
depends_on = None


DEFAULT_UOMS = ("PCS", "KG", "MTR", "LTR", "BOX", "SET", "TON", "PACK")


def upgrade() -> None:
    bind = op.get_bind()
    for code in DEFAULT_UOMS:
        bind.execute(
            sa.text(
                """
                INSERT INTO finished_goods_uom_option
                    (id, code, normalized_code, created_by, created_at)
                SELECT gen_random_uuid(), CAST(:code AS VARCHAR(32)),
                       CAST(:code AS VARCHAR(32)), 'SYSTEM', CURRENT_TIMESTAMP
                WHERE NOT EXISTS (
                    SELECT 1 FROM finished_goods_uom_option
                    WHERE normalized_code = CAST(:code AS VARCHAR(32))
                )
                """
            ),
            {"code": code},
        )


def downgrade() -> None:
    # UOMs may be in active use, so downgrading must not delete user data.
    pass
