"""
FastAPI router for Enterprise Procure-to-Pay (P2P) Finance module.
Base path: /api/v1/finance
"""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.modules.finance.application.finance_service import FinanceService
from app.modules.finance.infrastructure.api.schemas import (
    APAgingResponse,
    BudgetCheckResponse,
    FinanceAdjustmentCreate,
    FinanceAdjustmentResponse,
    FinanceAuditEventResponse,
    FinanceDashboardSummary,
    FinanceExceptionResponse,
    InvoiceApprovalRequest,
    InvoiceHoldRequest,
    InvoiceMatchResponse,
    MatchOverrideRequest,
    PaymentCreate,
    PaymentResponse,
    POHoldRequest,
    ResolveExceptionRequest,
    SupplierInvoiceCreate,
    SupplierInvoiceResponse,
    SupplierStatementResponse,
)
from app.modules.procurement.infrastructure.persistence.models import (
    PurchaseOrderModel,
    SupplierModel,
)
from app.modules.receiving.infrastructure.persistence.models import GrnModel
from app.security.dependencies import CurrentUser, get_current_user, require_permission

router = APIRouter(prefix="/api/v1/finance", tags=["Finance - Procure to Pay"])


def _get_supp_name(supp) -> Optional[str]:
    if not supp:
        return None
    return getattr(supp, "supplier_name", getattr(supp, "name", None))


def _get_supp_code(supp) -> Optional[str]:
    if not supp:
        return None
    return getattr(supp, "supplier_code", getattr(supp, "code", None))


def _to_invoice_resp(inv, supp_map=None, po_map=None, grn_map=None) -> SupplierInvoiceResponse:
    s_name = None
    s_code = None
    if supp_map and inv.supplier_id in supp_map:
        s = supp_map[inv.supplier_id]
        s_name = _get_supp_name(s)
        s_code = _get_supp_code(s)

    po_num = None
    if po_map and inv.po_id in po_map:
        po_num = po_map[inv.po_id].po_number

    grn_num = None
    if grn_map and inv.grn_id in grn_map:
        grn_num = grn_map[inv.grn_id].grn_number

    items_resp = []
    if hasattr(inv, "items") and inv.items:
        for it in inv.items:
            items_resp.append({
                "id": it.id,
                "invoice_id": it.invoice_id,
                "material_id": it.material_id,
                "material_code": it.material_code,
                "material_name": it.material_name,
                "description": it.description,
                "quantity": float(it.quantity),
                "uom": it.uom,
                "unit_price": float(it.unit_price),
                "discount": float(it.discount),
                "tax": float(it.tax),
                "line_total": float(it.line_total),
                "po_item_id": it.po_item_id,
                "grn_line_id": it.grn_line_id,
                "created_at": it.created_at,
            })

    return SupplierInvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        supplier_id=inv.supplier_id,
        supplier_name=s_name,
        supplier_code=s_code,
        po_id=inv.po_id,
        po_number=po_num,
        grn_id=inv.grn_id,
        grn_number=grn_num,
        invoice_date=inv.invoice_date,
        due_date=inv.due_date,
        currency=inv.currency,
        payment_terms=inv.payment_terms,
        subtotal=float(inv.subtotal or 0.0),
        discount_amount=float(inv.discount_amount or 0.0),
        tax_amount=float(inv.tax_amount or 0.0),
        freight_charges=float(inv.freight_charges or 0.0),
        other_charges=float(inv.other_charges or 0.0),
        grand_total=float(inv.grand_total or 0.0),
        paid_amount=float(inv.paid_amount or 0.0),
        outstanding_amount=float(inv.outstanding_amount or 0.0),
        status=inv.status,
        match_status=inv.match_status,
        notes=inv.notes,
        hold_reason=inv.hold_reason,
        hold_comment=inv.hold_comment,
        rejection_reason=inv.rejection_reason,
        approved_by=inv.approved_by,
        approved_at=inv.approved_at,
        created_by=inv.created_by,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
        items=items_resp,
    )


# -------------------------------------------------------------
# 1. Finance Cockpit & Dashboard
# -------------------------------------------------------------
@router.get("/dashboard", response_model=FinanceDashboardSummary)
async def get_finance_dashboard(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    summary = await FinanceService.get_dashboard_summary(db=db)
    # Fetch top recent invoices
    recent_invoices = await FinanceService.list_invoices(db=db, limit=5)
    
    # Gather suppliers
    supp_ids = {inv.supplier_id for inv in recent_invoices}
    supp_map = {}
    if supp_ids:
        s_stmt = select(SupplierModel).where(SupplierModel.id.in_(supp_ids))
        s_res = await db.execute(s_stmt)
        supp_map = {s.id: s for s in s_res.scalars().all()}

    inv_resps = [_to_invoice_resp(inv, supp_map=supp_map) for inv in recent_invoices]

    # Fetch top recent payments
    recent_payments = await FinanceService.list_payments(db=db, limit=5)
    pay_resps = []
    for p in recent_payments:
        supp = supp_map.get(p.supplier_id)
        allocs = []
        if hasattr(p, "allocations") and p.allocations:
            for al in p.allocations:
                allocs.append({
                    "id": al.id,
                    "payment_id": al.payment_id,
                    "invoice_id": al.invoice_id,
                    "allocated_amount": float(al.allocated_amount),
                    "notes": al.notes,
                    "allocated_by": al.allocated_by,
                    "allocated_at": al.allocated_at,
                })
        pay_resps.append(PaymentResponse(
            id=p.id,
            payment_reference=p.payment_reference,
            supplier_id=p.supplier_id,
            supplier_name=_get_supp_name(supp),
            payment_date=p.payment_date,
            amount=float(p.amount),
            allocated_amount=float(p.allocated_amount),
            unallocated_amount=float(p.unallocated_amount),
            currency=p.currency,
            payment_method=p.payment_method,
            transaction_reference=p.transaction_reference,
            bank_reference=p.bank_reference,
            bank_name=p.bank_name,
            status=p.status,
            notes=p.notes,
            created_by=p.created_by,
            created_at=p.created_at,
            allocations=allocs,
        ))

    summary["recent_invoices"] = inv_resps
    summary["recent_payments"] = pay_resps
    return summary


# -------------------------------------------------------------
# 2. Budget Check & PO Holds
# -------------------------------------------------------------
@router.get("/budget-check/{po_id}", response_model=BudgetCheckResponse)
async def check_budget_for_po(
    po_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    try:
        return await FinanceService.check_po_budget(db=db, po_id=po_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/purchase-orders/{po_id}/hold")
async def hold_purchase_order(
    po_id: uuid.UUID,
    hold_req: POHoldRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:approve")),
):
    try:
        return await FinanceService.put_po_on_hold(db=db, po_id=po_id, hold_req=hold_req, user=user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/purchase-orders/{po_id}/release-hold")
async def release_hold_purchase_order(
    po_id: uuid.UUID,
    body: Dict[str, str],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:approve")),
):
    notes = body.get("notes") or body.get("resolution_notes") or "Released from hold"
    try:
        return await FinanceService.release_po_hold(db=db, po_id=po_id, resolution_notes=notes, user=user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# -------------------------------------------------------------
# 3. Supplier Invoices
# -------------------------------------------------------------
@router.post("/invoices", response_model=SupplierInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier_invoice(
    invoice_in: SupplierInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:invoice:write")),
):
    try:
        inv = await FinanceService.create_invoice(db=db, invoice_in=invoice_in, user=user)
        # Fetch supplier for name
        s_stmt = select(SupplierModel).where(SupplierModel.id == inv.supplier_id)
        s_res = await db.execute(s_stmt)
        supp = s_res.scalar_one_or_none()
        supp_map = {supp.id: supp} if supp else {}
        return _to_invoice_resp(inv, supp_map=supp_map)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices", response_model=List[SupplierInvoiceResponse])
async def list_supplier_invoices(
    status: Optional[str] = None,
    match_status: Optional[str] = None,
    supplier_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    invoices = await FinanceService.list_invoices(
        db=db,
        status=status,
        match_status=match_status,
        supplier_id=supplier_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    if not invoices:
        return []

    supp_ids = {inv.supplier_id for inv in invoices}
    po_ids = {inv.po_id for inv in invoices if inv.po_id}
    grn_ids = {inv.grn_id for inv in invoices if inv.grn_id}

    supp_map = {}
    if supp_ids:
        s_stmt = select(SupplierModel).where(SupplierModel.id.in_(supp_ids))
        s_res = await db.execute(s_stmt)
        supp_map = {s.id: s for s in s_res.scalars().all()}

    po_map = {}
    if po_ids:
        p_stmt = select(PurchaseOrderModel).where(PurchaseOrderModel.id.in_(po_ids))
        p_res = await db.execute(p_stmt)
        po_map = {p.id: p for p in p_res.scalars().all()}

    grn_map = {}
    if grn_ids:
        g_stmt = select(GrnModel).where(GrnModel.id.in_(grn_ids))
        g_res = await db.execute(g_stmt)
        grn_map = {g.id: g for g in g_res.scalars().all()}

    return [_to_invoice_resp(inv, supp_map=supp_map, po_map=po_map, grn_map=grn_map) for inv in invoices]


@router.get("/invoices/{invoice_id}", response_model=SupplierInvoiceResponse)
async def get_supplier_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    inv = await FinanceService.get_invoice_by_id(db=db, invoice_id=invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    s_stmt = select(SupplierModel).where(SupplierModel.id == inv.supplier_id)
    s_res = await db.execute(s_stmt)
    supp = s_res.scalar_one_or_none()
    supp_map = {supp.id: supp} if supp else {}

    po_map = {}
    if inv.po_id:
        p_stmt = select(PurchaseOrderModel).where(PurchaseOrderModel.id == inv.po_id)
        p_res = await db.execute(p_stmt)
        po = p_res.scalar_one_or_none()
        if po:
            po_map = {po.id: po}

    grn_map = {}
    if inv.grn_id:
        g_stmt = select(GrnModel).where(GrnModel.id == inv.grn_id)
        g_res = await db.execute(g_stmt)
        grn = g_res.scalar_one_or_none()
        if grn:
            grn_map = {grn.id: grn}

    return _to_invoice_resp(inv, supp_map=supp_map, po_map=po_map, grn_map=grn_map)


# -------------------------------------------------------------
# 4. 3-Way Matching Actions
# -------------------------------------------------------------
@router.post("/invoices/{invoice_id}/match", response_model=InvoiceMatchResponse)
async def run_invoice_matching(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:match")),
):
    try:
        match_rec = await FinanceService.execute_matching(db=db, invoice_id=invoice_id, user=user)
        return InvoiceMatchResponse(
            id=match_rec.id,
            invoice_id=match_rec.invoice_id,
            po_id=match_rec.po_id,
            grn_id=match_rec.grn_id,
            match_status=match_rec.match_status,
            po_quantity_total=float(match_rec.po_quantity_total),
            grn_quantity_total=float(match_rec.grn_quantity_total),
            invoice_quantity_total=float(match_rec.invoice_quantity_total),
            quantity_variance=float(match_rec.quantity_variance),
            price_variance=float(match_rec.price_variance),
            tax_variance=float(match_rec.tax_variance),
            total_variance=float(match_rec.total_variance),
            tolerance_percentage=float(match_rec.tolerance_percentage),
            exception_reason=match_rec.exception_reason,
            exception_details=match_rec.exception_details,
            matched_by=match_rec.matched_by,
            matched_at=match_rec.matched_at,
            override_by=match_rec.override_by,
            override_reason=match_rec.override_reason,
            override_at=match_rec.override_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invoices/{invoice_id}/override-match", response_model=InvoiceMatchResponse)
async def override_invoice_matching(
    invoice_id: uuid.UUID,
    req: MatchOverrideRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:approve")),
):
    try:
        match_rec = await FinanceService.override_match_discrepancy(
            db=db, invoice_id=invoice_id, override_reason=req.override_reason, user=user
        )
        return InvoiceMatchResponse(
            id=match_rec.id,
            invoice_id=match_rec.invoice_id,
            po_id=match_rec.po_id,
            grn_id=match_rec.grn_id,
            match_status=match_rec.match_status,
            po_quantity_total=float(match_rec.po_quantity_total),
            grn_quantity_total=float(match_rec.grn_quantity_total),
            invoice_quantity_total=float(match_rec.invoice_quantity_total),
            quantity_variance=float(match_rec.quantity_variance),
            price_variance=float(match_rec.price_variance),
            tax_variance=float(match_rec.tax_variance),
            total_variance=float(match_rec.total_variance),
            tolerance_percentage=float(match_rec.tolerance_percentage),
            exception_reason=match_rec.exception_reason,
            exception_details=match_rec.exception_details,
            matched_by=match_rec.matched_by,
            matched_at=match_rec.matched_at,
            override_by=match_rec.override_by,
            override_reason=match_rec.override_reason,
            override_at=match_rec.override_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# 5. AP Approvals, Rejections, Holds
# -------------------------------------------------------------
@router.post("/invoices/{invoice_id}/approve", response_model=SupplierInvoiceResponse)
async def approve_invoice(
    invoice_id: uuid.UUID,
    req: InvoiceApprovalRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:approve")),
):
    try:
        inv = await FinanceService.approve_or_reject_invoice(
            db=db,
            invoice_id=invoice_id,
            approved=req.approved,
            notes=req.notes,
            rejection_reason=req.rejection_reason,
            user=user,
        )
        return _to_invoice_resp(inv)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invoices/{invoice_id}/hold", response_model=SupplierInvoiceResponse)
async def hold_invoice(
    invoice_id: uuid.UUID,
    req: InvoiceHoldRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:approve")),
):
    try:
        inv = await FinanceService.hold_invoice(
            db=db,
            invoice_id=invoice_id,
            hold_reason=req.hold_reason,
            hold_comment=req.hold_comment,
            user=user,
        )
        return _to_invoice_resp(inv)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# 6. Payment Processing & Allocations
# -------------------------------------------------------------
@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payment_in: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:pay")),
):
    try:
        pay = await FinanceService.process_payment(db=db, payment_in=payment_in, user=user)
        # Fetch supplier
        s_stmt = select(SupplierModel).where(SupplierModel.id == pay.supplier_id)
        s_res = await db.execute(s_stmt)
        supp = s_res.scalar_one_or_none()

        allocs = []
        for al in pay.allocations:
            allocs.append({
                "id": al.id,
                "payment_id": al.payment_id,
                "invoice_id": al.invoice_id,
                "allocated_amount": float(al.allocated_amount),
                "notes": al.notes,
                "allocated_by": al.allocated_by,
                "allocated_at": al.allocated_at,
            })

        return PaymentResponse(
            id=pay.id,
            payment_reference=pay.payment_reference,
            supplier_id=pay.supplier_id,
            supplier_name=_get_supp_name(supp),
            payment_date=pay.payment_date,
            amount=float(pay.amount),
            allocated_amount=float(pay.allocated_amount),
            unallocated_amount=float(pay.unallocated_amount),
            currency=pay.currency,
            payment_method=pay.payment_method,
            transaction_reference=pay.transaction_reference,
            bank_reference=pay.bank_reference,
            bank_name=pay.bank_name,
            status=pay.status,
            notes=pay.notes,
            created_by=pay.created_by,
            created_at=pay.created_at,
            allocations=allocs,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    supplier_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    payments = await FinanceService.list_payments(
        db=db, supplier_id=supplier_id, search=search, limit=limit, offset=offset
    )
    if not payments:
        return []

    supp_ids = {p.supplier_id for p in payments}
    supp_map = {}
    if supp_ids:
        s_stmt = select(SupplierModel).where(SupplierModel.id.in_(supp_ids))
        s_res = await db.execute(s_stmt)
        supp_map = {s.id: s for s in s_res.scalars().all()}

    resps = []
    for p in payments:
        supp = supp_map.get(p.supplier_id)
        allocs = []
        for al in p.allocations:
            allocs.append({
                "id": al.id,
                "payment_id": al.payment_id,
                "invoice_id": al.invoice_id,
                "allocated_amount": float(al.allocated_amount),
                "notes": al.notes,
                "allocated_by": al.allocated_by,
                "allocated_at": al.allocated_at,
            })
        resps.append(PaymentResponse(
            id=p.id,
            payment_reference=p.payment_reference,
            supplier_id=p.supplier_id,
            supplier_name=_get_supp_name(supp),
            payment_date=p.payment_date,
            amount=float(p.amount),
            allocated_amount=float(p.allocated_amount),
            unallocated_amount=float(p.unallocated_amount),
            currency=p.currency,
            payment_method=p.payment_method,
            transaction_reference=p.transaction_reference,
            bank_reference=p.bank_reference,
            bank_name=p.bank_name,
            status=p.status,
            notes=p.notes,
            created_by=p.created_by,
            created_at=p.created_at,
            allocations=allocs,
        ))
    return resps


# -------------------------------------------------------------
# 7. Credit & Debit Notes (Adjustments)
# -------------------------------------------------------------
@router.post("/adjustments", response_model=FinanceAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    adj_in: FinanceAdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:adjust")),
):
    adj = await FinanceService.create_adjustment(db=db, adj_in=adj_in, user=user)
    supp_stmt = select(SupplierModel).where(SupplierModel.id == adj.supplier_id)
    supp_res = await db.execute(supp_stmt)
    supp = supp_res.scalar_one_or_none()

    inv_num = None
    if adj.invoice_id:
        inv_stmt = select(SupplierInvoiceModel).where(SupplierInvoiceModel.id == adj.invoice_id)
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalar_one_or_none()
        if inv:
            inv_num = inv.invoice_number

    return FinanceAdjustmentResponse(
        id=adj.id,
        note_type=adj.note_type,
        note_number=adj.note_number,
        supplier_id=adj.supplier_id,
        supplier_name=_get_supp_name(supp),
        invoice_id=adj.invoice_id,
        invoice_number=inv_num,
        amount=float(adj.amount),
        tax_amount=float(adj.tax_amount),
        total_amount=float(adj.total_amount),
        reason=adj.reason,
        status=adj.status,
        note_date=adj.note_date,
        created_by=adj.created_by,
        approved_by=adj.approved_by,
        created_at=adj.created_at,
    )


@router.get("/adjustments", response_model=List[FinanceAdjustmentResponse])
async def list_adjustments(
    supplier_id: Optional[uuid.UUID] = None,
    note_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    adjs = await FinanceService.list_adjustments(
        db=db, supplier_id=supplier_id, note_type=note_type, limit=limit, offset=offset
    )
    if not adjs:
        return []

    supp_ids = {a.supplier_id for a in adjs}
    inv_ids = {a.invoice_id for a in adjs if a.invoice_id}

    supp_map = {}
    if supp_ids:
        s_stmt = select(SupplierModel).where(SupplierModel.id.in_(supp_ids))
        s_res = await db.execute(s_stmt)
        supp_map = {s.id: s for s in s_res.scalars().all()}

    inv_map = {}
    if inv_ids:
        i_stmt = select(SupplierInvoiceModel).where(SupplierInvoiceModel.id.in_(inv_ids))
        i_res = await db.execute(i_stmt)
        inv_map = {i.id: i for i in i_res.scalars().all()}

    resps = []
    for a in adjs:
        supp = supp_map.get(a.supplier_id)
        inv = inv_map.get(a.invoice_id)
        resps.append(FinanceAdjustmentResponse(
            id=a.id,
            note_type=a.note_type,
            note_number=a.note_number,
            supplier_id=a.supplier_id,
            supplier_name=_get_supp_name(supp),
            invoice_id=a.invoice_id,
            invoice_number=inv.invoice_number if inv else None,
            amount=float(a.amount),
            tax_amount=float(a.tax_amount),
            total_amount=float(a.total_amount),
            reason=a.reason,
            status=a.status,
            note_date=a.note_date,
            created_by=a.created_by,
            approved_by=a.approved_by,
            created_at=a.created_at,
        ))
    return resps


# -------------------------------------------------------------
# 8. Supplier Statements & AP Aging
# -------------------------------------------------------------
@router.get("/suppliers/{supplier_id}/statement", response_model=SupplierStatementResponse)
@router.get("/supplier-statement/{supplier_id}", response_model=SupplierStatementResponse)
async def get_supplier_statement(
    supplier_id: uuid.UUID,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    try:
        return await FinanceService.get_supplier_statement(
            db=db, supplier_id=supplier_id, from_date=from_date, to_date=to_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/reports/ap-aging", response_model=APAgingResponse)
@router.get("/payables/aging", response_model=APAgingResponse)
async def get_ap_aging_report(
    as_of_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    return await FinanceService.get_ap_aging(db=db, as_of_date=as_of_date)


# -------------------------------------------------------------
# 9. Audit Trail
# -------------------------------------------------------------
@router.get("/audit-trail", response_model=List[FinanceAuditEventResponse])
@router.get("/reports/audit-trail", response_model=List[FinanceAuditEventResponse])
async def get_finance_audit_trail(
    entity_type: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    events = await FinanceService.get_audit_trail(
        db=db, entity_type=entity_type, entity_id=entity_id, limit=limit, offset=offset
    )
    return [
        FinanceAuditEventResponse(
            id=ev.id,
            action=ev.action,
            entity_type=ev.entity_type,
            entity_id=ev.entity_id,
            entity_number=ev.entity_number,
            user_username=ev.user_username,
            user_role=ev.user_role,
            previous_status=ev.previous_status,
            new_status=ev.new_status,
            reason=ev.reason,
            details=ev.details,
            timestamp=ev.timestamp,
        )
        for ev in events
    ]


# -------------------------------------------------------------
# 10. Finance Exceptions
# -------------------------------------------------------------
@router.get("/exceptions", response_model=List[FinanceExceptionResponse])
async def list_finance_exceptions(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    entity_type: Optional[str] = None,
    supplier_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:read")),
):
    exceptions = await FinanceService.list_exceptions(
        db=db,
        status=status,
        severity=severity,
        entity_type=entity_type,
        supplier_id=supplier_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    if not exceptions:
        return []

    # Map supplier names
    supp_ids = {e.supplier_id for e in exceptions if e.supplier_id}
    supp_map = {}
    if supp_ids:
        s_stmt = select(SupplierModel).where(SupplierModel.id.in_(supp_ids))
        s_res = await db.execute(s_stmt)
        supp_map = {s.id: _get_supp_name(s) for s in s_res.scalars().all()}

    return [
        FinanceExceptionResponse(
            id=e.id,
            exception_type=e.exception_type,
            severity=e.severity,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            entity_number=e.entity_number,
            supplier_id=e.supplier_id,
            supplier_name=supp_map.get(e.supplier_id),
            variance_amount=float(e.variance_amount or 0.0),
            reason=e.reason,
            status=e.status,
            resolution_comment=e.resolution_comment,
            resolved_by=e.resolved_by,
            resolved_at=e.resolved_at,
            created_at=e.created_at,
        )
        for e in exceptions
    ]


@router.post("/exceptions/{exception_id}/resolve", response_model=FinanceExceptionResponse)
async def resolve_finance_exception(
    exception_id: uuid.UUID,
    req: ResolveExceptionRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_permission("finance:approve")),
):
    try:
        e = await FinanceService.resolve_exception(
            db=db,
            exception_id=exception_id,
            resolution_comment=req.resolution_comment,
            user=user,
        )
        supp_name = None
        if e.supplier_id:
            s_stmt = select(SupplierModel).where(SupplierModel.id == e.supplier_id)
            s_res = await db.execute(s_stmt)
            supp = s_res.scalar_one_or_none()
            if supp:
                supp_name = _get_supp_name(supp)

        return FinanceExceptionResponse(
            id=e.id,
            exception_type=e.exception_type,
            severity=e.severity,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            entity_number=e.entity_number,
            supplier_id=e.supplier_id,
            supplier_name=supp_name,
            variance_amount=float(e.variance_amount or 0.0),
            reason=e.reason,
            status=e.status,
            resolution_comment=e.resolution_comment,
            resolved_by=e.resolved_by,
            resolved_at=e.resolved_at,
            created_at=e.created_at,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))

