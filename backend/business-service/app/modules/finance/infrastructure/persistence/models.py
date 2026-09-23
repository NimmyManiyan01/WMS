"""
SQLAlchemy ORM models for Procure-to-Pay (P2P) Finance module.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, GUID


class DepartmentBudgetModel(Base):
    __tablename__ = "department_budget"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    financial_year: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    budget_category: Mapped[str] = mapped_column(String(128), nullable=False, default="CAPEX")
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    committed_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    consumed_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())


class SupplierInvoiceModel(Base):
    __tablename__ = "supplier_invoice"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False, index=True)
    po_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("purchase_order.id", ondelete="SET NULL"), nullable=True, index=True)
    grn_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("grn.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    payment_terms: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    freight_charges: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    other_charges: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    grand_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    outstanding_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="RECEIVED", index=True)
    match_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hold_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hold_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    approved_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("supplier_id", "invoice_number", name="uq_supplier_invoice_number"),
    )

    items: Mapped[List["SupplierInvoiceItemModel"]] = relationship(
        "SupplierInvoiceItemModel", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )
    matches: Mapped[List["InvoiceMatchModel"]] = relationship(
        "InvoiceMatchModel", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )
    allocations: Mapped[List["PaymentAllocationModel"]] = relationship(
        "PaymentAllocationModel", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )


class SupplierInvoiceItemModel(Base):
    __tablename__ = "supplier_invoice_item"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("supplier_invoice.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("material.id", ondelete="SET NULL"), nullable=True)
    material_code: Mapped[str] = mapped_column(String(64), nullable=False)
    material_name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    uom: Mapped[str] = mapped_column(String(32), nullable=False, default="PCS")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    tax: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    po_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("purchase_order_item.id", ondelete="SET NULL"), nullable=True)
    grn_line_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("grn_line.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    invoice: Mapped["SupplierInvoiceModel"] = relationship("SupplierInvoiceModel", back_populates="items")


class InvoiceMatchModel(Base):
    __tablename__ = "invoice_match"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("supplier_invoice.id", ondelete="CASCADE"), nullable=False, index=True)
    po_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("purchase_order.id", ondelete="SET NULL"), nullable=True)
    grn_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("grn.id", ondelete="SET NULL"), nullable=True)

    match_status: Mapped[str] = mapped_column(String(32), nullable=False, default="MATCHED", index=True)
    po_quantity_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    grn_quantity_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    invoice_quantity_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))

    quantity_variance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    price_variance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    tax_variance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    total_variance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    tolerance_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0.0"))

    exception_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    exception_details: Mapped[dict | list] = mapped_column(JSONB, nullable=False, default=list)

    matched_by: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    matched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    override_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    override_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    invoice: Mapped["SupplierInvoiceModel"] = relationship("SupplierInvoiceModel", back_populates="matches")


class FinanceExceptionModel(Base):
    __tablename__ = "finance_exception"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    exception_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="MEDIUM", index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(GUID, nullable=False, index=True)
    entity_number: Mapped[str] = mapped_column(String(128), nullable=False)
    supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("supplier.id", ondelete="SET NULL"), nullable=True)

    variance_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="OPEN", index=True)

    resolution_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())


class PaymentModel(Base):
    __tablename__ = "payment"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    payment_reference: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    unallocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    payment_method: Mapped[str] = mapped_column(String(64), nullable=False, default="NEFT")
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    bank_reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="COMPLETED", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())

    allocations: Mapped[List["PaymentAllocationModel"]] = relationship(
        "PaymentAllocationModel", back_populates="payment", cascade="all, delete-orphan", lazy="selectin"
    )


class PaymentAllocationModel(Base):
    __tablename__ = "payment_allocation"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("payment.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("supplier_invoice.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    allocated_by: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    allocated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    payment: Mapped["PaymentModel"] = relationship("PaymentModel", back_populates="allocations")
    invoice: Mapped["SupplierInvoiceModel"] = relationship("SupplierInvoiceModel", back_populates="allocations")


class FinanceAdjustmentModel(Base):
    __tablename__ = "finance_adjustment"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    note_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # CREDIT_NOTE or DEBIT_NOTE
    note_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("supplier.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("supplier_invoice.id", ondelete="SET NULL"), nullable=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="APPROVED", index=True)
    note_date: Mapped[date] = mapped_column(Date, nullable=False)

    created_by: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    approved_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())


class FinanceAuditEventModel(Base):
    __tablename__ = "finance_audit_event"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(GUID, nullable=False, index=True)
    entity_number: Mapped[str] = mapped_column(String(128), nullable=False)
    user_username: Mapped[str] = mapped_column(String(128), nullable=False)
    user_role: Mapped[str] = mapped_column(String(64), nullable=False, default="FINANCE")
    previous_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    details: Mapped[Optional[dict | list]] = mapped_column(JSONB, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now(), index=True)
