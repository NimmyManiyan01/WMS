"""
Pydantic schemas for Procure-to-Pay (P2P) Finance APIs.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Budget Schemas
# -------------------------------------------------------------
class BudgetCheckResponse(BaseModel):
    department: str
    financial_year: str
    budget_category: str
    allocated_amount: float
    committed_amount: float
    consumed_amount: float
    available_amount: float
    po_amount: float
    remaining_after_po: float
    status: str  # SUFFICIENT, WARNING (e.g. >80% used), EXCEEDED
    warning_message: Optional[str] = None


class POHoldRequest(BaseModel):
    hold_reason: str = Field(..., description="E.g. BUDGET_EXCEEDED, PRICE_DISCREPANCY, TAX_MISMATCH, VENDOR_HOLD, PENDING_DOCUMENTS")
    hold_comment: Optional[str] = None


# -------------------------------------------------------------
# Supplier Invoice Schemas
# -------------------------------------------------------------
class InvoiceItemCreate(BaseModel):
    material_id: Optional[uuid.UUID] = None
    material_code: str
    material_name: str
    description: Optional[str] = None
    quantity: float = Field(..., gt=0)
    uom: str = "PCS"
    unit_price: float = Field(..., ge=0)
    discount: float = 0.0
    tax: float = 0.0
    po_item_id: Optional[uuid.UUID] = None
    grn_line_id: Optional[uuid.UUID] = None


class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    material_id: Optional[uuid.UUID] = None
    material_code: str
    material_name: str
    description: Optional[str] = None
    quantity: float
    uom: str
    unit_price: float
    discount: float
    tax: float
    line_total: float
    po_item_id: Optional[uuid.UUID] = None
    grn_line_id: Optional[uuid.UUID] = None
    created_at: datetime


class SupplierInvoiceCreate(BaseModel):
    invoice_number: str
    supplier_id: uuid.UUID
    po_id: Optional[uuid.UUID] = None
    grn_id: Optional[uuid.UUID] = None
    invoice_date: date
    due_date: date
    currency: str = "INR"
    payment_terms: Optional[str] = "Net 30"
    discount_amount: Optional[float] = 0.0
    tax_amount: Optional[float] = None
    freight_charges: float = 0.0
    other_charges: float = 0.0
    notes: Optional[str] = None
    items: List[InvoiceItemCreate]


class SupplierInvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    supplier_id: uuid.UUID
    supplier_name: Optional[str] = None
    supplier_code: Optional[str] = None
    po_id: Optional[uuid.UUID] = None
    po_number: Optional[str] = None
    grn_id: Optional[uuid.UUID] = None
    grn_number: Optional[str] = None
    invoice_date: date
    due_date: date
    currency: str
    payment_terms: Optional[str] = None
    subtotal: float
    discount_amount: float
    tax_amount: float
    freight_charges: float
    other_charges: float
    grand_total: float
    paid_amount: float
    outstanding_amount: float
    status: str
    match_status: str
    notes: Optional[str] = None
    hold_reason: Optional[str] = None
    hold_comment: Optional[str] = None
    rejection_reason: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []


class InvoiceApprovalRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class InvoiceHoldRequest(BaseModel):
    hold_reason: str
    hold_comment: Optional[str] = None


# -------------------------------------------------------------
# 3-Way Matching Schemas
# -------------------------------------------------------------
class InvoiceMatchResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    po_id: Optional[uuid.UUID] = None
    grn_id: Optional[uuid.UUID] = None
    match_status: str
    po_quantity_total: float
    grn_quantity_total: float
    invoice_quantity_total: float
    quantity_variance: float
    price_variance: float
    tax_variance: float
    total_variance: float
    tolerance_percentage: float
    exception_reason: Optional[str] = None
    exception_details: Any = []
    matched_by: str
    matched_at: datetime
    override_by: Optional[str] = None
    override_reason: Optional[str] = None
    override_at: Optional[datetime] = None


class MatchOverrideRequest(BaseModel):
    override_reason: str = Field(..., min_length=5)


# -------------------------------------------------------------
# Payment Schemas
# -------------------------------------------------------------
class PaymentAllocationItem(BaseModel):
    invoice_id: uuid.UUID
    allocated_amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class PaymentAllocationResponse(BaseModel):
    id: uuid.UUID
    payment_id: uuid.UUID
    invoice_id: uuid.UUID
    invoice_number: Optional[str] = None
    allocated_amount: float
    notes: Optional[str] = None
    allocated_by: str
    allocated_at: datetime


class PaymentCreate(BaseModel):
    supplier_id: uuid.UUID
    payment_reference: Optional[str] = None  # Auto-generated if blank
    payment_date: date
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    payment_method: str = "NEFT"  # NEFT, RTGS, CHEQUE, UPI, WIRE
    transaction_reference: Optional[str] = None
    bank_reference: Optional[str] = None
    bank_name: Optional[str] = None
    notes: Optional[str] = None
    allocations: List[PaymentAllocationItem] = []


class PaymentResponse(BaseModel):
    id: uuid.UUID
    payment_reference: str
    supplier_id: uuid.UUID
    supplier_name: Optional[str] = None
    payment_date: date
    amount: float
    allocated_amount: float
    unallocated_amount: float
    currency: str
    payment_method: str
    transaction_reference: Optional[str] = None
    bank_reference: Optional[str] = None
    bank_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    allocations: List[PaymentAllocationResponse] = []


# -------------------------------------------------------------
# Credit / Debit Note Adjustments
# -------------------------------------------------------------
class FinanceAdjustmentCreate(BaseModel):
    note_type: str = Field(..., description="CREDIT_NOTE or DEBIT_NOTE")
    note_number: Optional[str] = None
    supplier_id: uuid.UUID
    invoice_id: Optional[uuid.UUID] = None
    amount: float = Field(..., gt=0)
    tax_amount: float = 0.0
    reason: str
    note_date: date


class FinanceAdjustmentResponse(BaseModel):
    id: uuid.UUID
    note_type: str
    note_number: str
    supplier_id: uuid.UUID
    supplier_name: Optional[str] = None
    invoice_id: Optional[uuid.UUID] = None
    invoice_number: Optional[str] = None
    amount: float
    tax_amount: float
    total_amount: float
    reason: str
    status: str
    note_date: date
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime


# -------------------------------------------------------------
# Supplier Statements & Reports
# -------------------------------------------------------------
class StatementEntry(BaseModel):
    date: date
    type: str  # INVOICE, PAYMENT, CREDIT_NOTE, DEBIT_NOTE
    reference_number: str
    description: str
    debit: float
    credit: float
    running_balance: float


class SupplierStatementResponse(BaseModel):
    supplier_id: uuid.UUID
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    total_invoiced: float
    total_paid: float
    total_adjustments: float
    closing_balance: float
    entries: List[StatementEntry] = []


class APAgingBucket(BaseModel):
    bucket_label: str  # "Current (0-30 days)", "31-60 days", "61-90 days", "90+ days"
    invoice_count: int
    total_amount: float


class APAgingResponse(BaseModel):
    as_of_date: date
    total_outstanding: float
    buckets: List[APAgingBucket]
    invoices: List[Dict[str, Any]] = []


# -------------------------------------------------------------
# Finance Exception Schemas
# -------------------------------------------------------------
class FinanceExceptionResponse(BaseModel):
    id: uuid.UUID
    exception_type: str
    severity: str
    entity_type: str
    entity_id: uuid.UUID
    entity_number: str
    supplier_id: Optional[uuid.UUID] = None
    supplier_name: Optional[str] = None
    variance_amount: float
    reason: str
    status: str
    resolution_comment: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class ResolveExceptionRequest(BaseModel):
    resolution_comment: str = Field(..., min_length=2, description="Explanation or override justification for resolving the exception")


# -------------------------------------------------------------
# Dashboard Cockpit Schemas
# -------------------------------------------------------------
class FinanceDashboardSummary(BaseModel):
    total_pending_po_approvals: int
    total_pending_po_value: float
    total_invoices_received: int
    total_invoices_pending_match: int
    total_invoices_pending_approval: int
    total_approved_unpaid_invoices: int
    total_ap_outstanding: float
    total_payments_this_month: float
    total_credit_notes_available: float
    total_exceptions_open: int
    budget_utilization_pct: float
    # Enhanced explicit fields matching Task 4
    pending_po_approvals: int = 0
    pending_po_value: float = 0.0
    pending_invoices: int = 0
    invoices_awaiting_approval: int = 0
    total_payable: float = 0.0
    due_soon_count: int = 0
    due_soon_amount: float = 0.0
    overdue_count: int = 0
    overdue_amount: float = 0.0
    payment_pending_count: int = 0
    payment_pending_amount: float = 0.0
    paid_count: int = 0
    paid_amount: float = 0.0
    on_hold_count: int = 0
    on_hold_amount: float = 0.0
    finance_exceptions_count: int = 0
    recent_invoices: List[SupplierInvoiceResponse] = []
    recent_payments: List[PaymentResponse] = []


# -------------------------------------------------------------
# Audit Trail Schemas
# -------------------------------------------------------------
class FinanceAuditEventResponse(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID
    entity_number: str
    user_username: str
    user_role: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    details: Any = None
    timestamp: datetime

