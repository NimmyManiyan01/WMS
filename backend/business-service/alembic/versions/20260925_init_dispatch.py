"""Init finished goods dispatch, driver, and vehicle tables.

Revision ID: 20260925_init_dispatch
Revises: 20260916_remove_seeded_stock
Create Date: 2026-09-22 23:10:00.000000

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260925_init_dispatch"
down_revision = "20260916_remove_seeded_stock"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dispatch_order",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dispatch_number", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("order_number", sa.String(64), nullable=False, index=True),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("warehouse_id", sa.String(64), nullable=False, server_default="WH-01"),
        sa.Column("status", sa.String(32), nullable=False, server_default="DRAFT"),
        sa.Column("driver_id", sa.String(36), nullable=True),
        sa.Column("vehicle_id", sa.String(36), nullable=True),
        sa.Column("route_code", sa.String(64), nullable=True),
        sa.Column("delivery_address", sa.Text, nullable=True),
        sa.Column("destination", sa.Text, nullable=True),
        sa.Column("scheduled_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_delivery_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", sa.String(32), nullable=False, server_default="Normal"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_table(
        "dispatch_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dispatch_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dispatch_order.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("material_code", sa.String(64), nullable=False),
        sa.Column("material_name", sa.String(255), nullable=False),
        sa.Column("quantity_ordered", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("quantity_available", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("quantity_reserved", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("quantity_picked", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("quantity_packed", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("quantity_loaded", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("quantity_pending", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("uom", sa.String(32), nullable=False, server_default="PCS"),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
    )

    op.create_table(
        "driver",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("driver_name", sa.String(128), nullable=False),
        sa.Column("license_number", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("email", sa.String(128), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="AVAILABLE"),
        sa.Column("rating", sa.Numeric(3, 2), nullable=False, server_default="5.0"),
        sa.Column("assigned_vehicle_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_table(
        "vehicle",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vehicle_number", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("vehicle_type", sa.String(64), nullable=False, server_default="Truck 10T"),
        sa.Column("capacity_tons", sa.Numeric(10, 2), nullable=False, server_default="10.0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="AVAILABLE"),
        sa.Column("current_driver_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("vehicle")
    op.drop_table("driver")
    op.drop_table("dispatch_item")
    op.drop_table("dispatch_order")
