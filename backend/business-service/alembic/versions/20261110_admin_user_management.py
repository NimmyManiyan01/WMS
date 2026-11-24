"""Add admin user-management fields and assembly units.

Revision ID: 20261110_admin_user_management
Revises: 20261104_manage_all_fg_uoms
Create Date: 2026-11-10
"""

from alembic import op
import sqlalchemy as sa

from app.database.base import GUID

revision = "20261110_admin_user_management"
down_revision = "20261104_manage_all_fg_uoms"
branch_labels = None
depends_on = None


def _columns(inspector: sa.Inspector, table: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table)}


def _indexes(inspector: sa.Inspector, table: str) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "store_manager_user" in tables:
        columns = _columns(inspector, "store_manager_user")
        if "shift_name" not in columns:
            op.add_column("store_manager_user", sa.Column("shift_name", sa.String(64), nullable=True))
        if "assembly_unit_code" not in columns:
            op.add_column("store_manager_user", sa.Column("assembly_unit_code", sa.String(64), nullable=True))
        if "page_permissions" not in columns:
            op.add_column(
                "store_manager_user",
                sa.Column("page_permissions", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            )
        inspector = sa.inspect(bind)
        if "ix_store_manager_user_assembly_unit_code" not in _indexes(inspector, "store_manager_user"):
            op.create_index(
                "ix_store_manager_user_assembly_unit_code",
                "store_manager_user",
                ["assembly_unit_code"],
            )

    if "assembly_unit" not in tables:
        op.create_table(
            "assembly_unit",
            sa.Column("id", GUID(), nullable=False),
            sa.Column("code", sa.String(64), nullable=False),
            sa.Column("name", sa.String(128), nullable=False),
            sa.Column("description", sa.String(255), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, server_default="ACTIVE"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )
        op.create_index("ix_assembly_unit_code", "assembly_unit", ["code"], unique=True)
        op.create_index("ix_assembly_unit_status", "assembly_unit", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "assembly_unit" in tables:
        op.drop_table("assembly_unit")
    if "store_manager_user" in tables:
        columns = _columns(inspector, "store_manager_user")
        indexes = _indexes(inspector, "store_manager_user")
        if "ix_store_manager_user_assembly_unit_code" in indexes:
            op.drop_index("ix_store_manager_user_assembly_unit_code", table_name="store_manager_user")
        for column in ("page_permissions", "assembly_unit_code", "shift_name"):
            if column in columns:
                op.drop_column("store_manager_user", column)
