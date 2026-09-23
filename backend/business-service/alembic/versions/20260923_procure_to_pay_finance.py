"""Enterprise Procure-to-Pay (P2P) Finance Schema Migration.

Revision ID: 20260923_p2p_finance
Revises: 20260921_po_rfq_totals
Create Date: 2026-09-22
"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260923_p2p_finance"
down_revision: Union[str, None] = "20260921_po_rfq_totals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return sa.inspect(op.get_bind())


def _table_exists(table_name: str) -> bool:
    return table_name in _inspector().get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(c["name"] == column_name for c in _inspector().get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return any(ix["name"] == index_name for ix in _inspector().get_indexes(table_name))


def upgrade() -> None:
    # ---------------------------------------------------------
    # 0. PO Columns for Hold tracking
    # ---------------------------------------------------------
    for col_name, col_type in [
        ("hold_reason", sa.String(255)),
        ("hold_comment", sa.Text()),
        ("held_by", sa.String(128)),
        ("held_at", sa.DateTime()),
    ]:
        if not _column_exists("purchase_order", col_name):
            op.add_column("purchase_order", sa.Column(col_name, col_type, nullable=True))

    # ---------------------------------------------------------
    # 1. Department Budget (Ensure table exists & has required columns)
    # ---------------------------------------------------------
    if not _table_exists("department_budget"):
        op.create_table(
            "department_budget",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("financial_year", sa.String(32), nullable=False, index=True),
            sa.Column("department", sa.String(128), nullable=False, index=True),
            sa.Column("budget_category", sa.String(128), nullable=False, default="CAPEX"),
            sa.Column("allocated_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("committed_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("consumed_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("currency", sa.String(10), nullable=False, default="INR"),
            sa.Column("status", sa.String(32), nullable=False, default="ACTIVE"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # ---------------------------------------------------------
    # 2. Supplier Invoice Header
    # ---------------------------------------------------------
    if not _table_exists("supplier_invoice"):
        op.create_table(
            "supplier_invoice",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("invoice_number", sa.String(128), nullable=False, index=True),
            sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("po_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_order.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("grn_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grn.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("invoice_date", sa.Date(), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("currency", sa.String(10), nullable=False, default="INR"),
            sa.Column("payment_terms", sa.String(128), nullable=True),
            sa.Column("subtotal", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("discount_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("tax_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("freight_charges", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("other_charges", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("grand_total", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("paid_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("outstanding_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("status", sa.String(32), nullable=False, default="RECEIVED", index=True),
            sa.Column("match_status", sa.String(32), nullable=False, default="PENDING", index=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("hold_reason", sa.String(255), nullable=True),
            sa.Column("hold_comment", sa.Text(), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("approved_by", sa.String(128), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.String(128), nullable=False, default="system"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_by", sa.String(128), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("supplier_id", "invoice_number", name="uq_supplier_invoice_number"),
        )

    # ---------------------------------------------------------
    # 3. Supplier Invoice Line Items
    # ---------------------------------------------------------
    if not _table_exists("supplier_invoice_item"):
        op.create_table(
            "supplier_invoice_item",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_invoice.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("material_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("material.id", ondelete="SET NULL"), nullable=True),
            sa.Column("material_code", sa.String(64), nullable=False),
            sa.Column("material_name", sa.String(256), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("quantity", sa.Numeric(18, 4), nullable=False),
            sa.Column("uom", sa.String(32), nullable=False, default="PCS"),
            sa.Column("unit_price", sa.Numeric(18, 4), nullable=False),
            sa.Column("discount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("tax", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("line_total", sa.Numeric(18, 4), nullable=False),
            sa.Column("po_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_order_item.id", ondelete="SET NULL"), nullable=True),
            sa.Column("grn_line_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grn_line.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # ---------------------------------------------------------
    # 4. Three-Way Matching Record
    # ---------------------------------------------------------
    if not _table_exists("invoice_match"):
        op.create_table(
            "invoice_match",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_invoice.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("po_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_order.id", ondelete="SET NULL"), nullable=True),
            sa.Column("grn_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grn.id", ondelete="SET NULL"), nullable=True),
            sa.Column("match_status", sa.String(32), nullable=False, default="MATCHED", index=True),
            sa.Column("po_quantity_total", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("grn_quantity_total", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("invoice_quantity_total", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("quantity_variance", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("price_variance", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("tax_variance", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("total_variance", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("tolerance_percentage", sa.Numeric(5, 2), nullable=False, default=0.0),
            sa.Column("exception_reason", sa.String(255), nullable=True),
            sa.Column("exception_details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("matched_by", sa.String(128), nullable=False, default="system"),
            sa.Column("matched_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("override_by", sa.String(128), nullable=True),
            sa.Column("override_reason", sa.Text(), nullable=True),
            sa.Column("override_at", sa.DateTime(), nullable=True),
        )

    # ---------------------------------------------------------
    # 5. Finance Exceptions & Holds
    # ---------------------------------------------------------
    if not _table_exists("finance_exception"):
        op.create_table(
            "finance_exception",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("exception_type", sa.String(64), nullable=False, index=True),
            sa.Column("severity", sa.String(32), nullable=False, default="MEDIUM", index=True),
            sa.Column("entity_type", sa.String(64), nullable=False, index=True),
            sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("entity_number", sa.String(128), nullable=False),
            sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier.id", ondelete="SET NULL"), nullable=True),
            sa.Column("variance_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, default="OPEN", index=True),
            sa.Column("resolution_comment", sa.Text(), nullable=True),
            sa.Column("resolved_by", sa.String(128), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # ---------------------------------------------------------
    # 6. Payment Register
    # ---------------------------------------------------------
    if not _table_exists("payment"):
        op.create_table(
            "payment",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("payment_reference", sa.String(64), unique=True, nullable=False, index=True),
            sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("payment_date", sa.Date(), nullable=False),
            sa.Column("amount", sa.Numeric(18, 4), nullable=False),
            sa.Column("allocated_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("unallocated_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("currency", sa.String(10), nullable=False, default="INR"),
            sa.Column("payment_method", sa.String(64), nullable=False, default="NEFT"),
            sa.Column("transaction_reference", sa.String(128), nullable=True),
            sa.Column("bank_reference", sa.String(128), nullable=True),
            sa.Column("bank_name", sa.String(128), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, default="COMPLETED", index=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(128), nullable=False, default="system"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # ---------------------------------------------------------
    # 7. Payment Allocation (Many-to-Many Payment -> Invoice)
    # ---------------------------------------------------------
    if not _table_exists("payment_allocation"):
        op.create_table(
            "payment_allocation",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payment.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_invoice.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("allocated_amount", sa.Numeric(18, 4), nullable=False),
            sa.Column("notes", sa.String(255), nullable=True),
            sa.Column("allocated_by", sa.String(128), nullable=False, default="system"),
            sa.Column("allocated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # ---------------------------------------------------------
    # 8. Credit Note / Debit Note Adjustments
    # ---------------------------------------------------------
    if not _table_exists("finance_adjustment"):
        op.create_table(
            "finance_adjustment",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("note_type", sa.String(32), nullable=False, index=True),  # CREDIT_NOTE or DEBIT_NOTE
            sa.Column("note_number", sa.String(64), unique=True, nullable=False, index=True),
            sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("supplier_invoice.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("amount", sa.Numeric(18, 4), nullable=False),
            sa.Column("tax_amount", sa.Numeric(18, 4), nullable=False, default=0.0),
            sa.Column("total_amount", sa.Numeric(18, 4), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, default="APPROVED", index=True),
            sa.Column("note_date", sa.Date(), nullable=False),
            sa.Column("created_by", sa.String(128), nullable=False, default="system"),
            sa.Column("approved_by", sa.String(128), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # ---------------------------------------------------------
    # 9. Immutable Finance Audit Trail
    # ---------------------------------------------------------
    if not _table_exists("finance_audit_event"):
        op.create_table(
            "finance_audit_event",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("action", sa.String(64), nullable=False, index=True),
            sa.Column("entity_type", sa.String(64), nullable=False, index=True),
            sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("entity_number", sa.String(128), nullable=False),
            sa.Column("user_username", sa.String(128), nullable=False),
            sa.Column("user_role", sa.String(64), nullable=False, default="FINANCE"),
            sa.Column("previous_status", sa.String(32), nullable=True),
            sa.Column("new_status", sa.String(32), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
        )


def downgrade() -> None:
    for tbl in [
        "finance_audit_event",
        "finance_adjustment",
        "payment_allocation",
        "payment",
        "finance_exception",
        "invoice_match",
        "supplier_invoice_item",
        "supplier_invoice",
    ]:
        if _table_exists(tbl):
            op.drop_table(tbl)

    for col in ["held_at", "held_by", "hold_comment", "hold_reason"]:
        if _column_exists("purchase_order", col):
            op.drop_column("purchase_order", col)
