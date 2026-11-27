"""Add account source and persisted admin audit logs.

Revision ID: 20261127_admin_audit_logs
Revises: 20261125_restore_mr_approval
"""
from alembic import op
import sqlalchemy as sa
from app.database.base import GUID

revision = "20261127_admin_audit_logs"
down_revision = "20261125_restore_mr_approval"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("store_manager_user", sa.Column("account_source", sa.String(32), nullable=False, server_default="WAREHOUSE"))
    op.create_index("ix_store_manager_user_account_source", "store_manager_user", ["account_source"])
    op.create_table("admin_audit_log",
        sa.Column("id", GUID(), nullable=False), sa.Column("actor", sa.String(128), nullable=False),
        sa.Column("action", sa.String(64), nullable=False), sa.Column("target_type", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(128), nullable=True), sa.Column("target_name", sa.String(128), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_admin_audit_log_actor", "admin_audit_log", ["actor"])
    op.create_index("ix_admin_audit_log_action", "admin_audit_log", ["action"])
    op.create_index("ix_admin_audit_log_created_at", "admin_audit_log", ["created_at"])

def downgrade() -> None:
    op.drop_table("admin_audit_log")
    op.drop_index("ix_store_manager_user_account_source", table_name="store_manager_user")
    op.drop_column("store_manager_user", "account_source")
