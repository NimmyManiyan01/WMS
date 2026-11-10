"""add notification details

Revision ID: 246123db4a01

Revises: 20260831_ensure_mat_cols

Create Date: 2026-09-01 13:45:51.153337

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "246123db4a01"

down_revision: Union[str, None] = "20260831_ensure_mat_cols"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Fresh databases do not have this table yet. Historically it was created
    # by the application startup DDL, which made the migration depend on the
    # service having been started before `alembic upgrade head`.
    if "notification" not in inspector.get_table_names():
        op.create_table(
            "notification",
            sa.Column("id", sa.UUID(), primary_key=True),
            sa.Column("user_role", sa.String(length=32), nullable=False),
            sa.Column("title", sa.String(length=256), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("link", sa.String(length=512), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        inspector = sa.inspect(bind)

    notification_cols = {
        column["name"]
        for column in inspector.get_columns("notification")
    }
    if "details" not in notification_cols:
        op.add_column(
            "notification",
            sa.Column("details", sa.JSON(), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    notification_cols = {
        column["name"]
        for column in inspector.get_columns("notification")
    }

    columns_to_remove = [
        "po_number",
        "asn_number",
        "driver_phone",
        "driver_name",
        "vehicle_number",
        "gate_pass_number",
        "allocation_time",
        "warehouse_name",
        "dock_type",
        "dock_location",
        "dock_name",
        "dock_code",
    ]

    for column_name in columns_to_remove:
        if column_name in notification_cols:
            op.drop_column("notification", column_name)
