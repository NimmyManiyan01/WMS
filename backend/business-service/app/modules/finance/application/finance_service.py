"""
Enterprise Procure-to-Pay (P2P) Finance Service.
Encapsulates business logic, state transitions, matching rules, budget validations, and auditing.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import and_, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.finance.domain.calculations import calculate_invoice_totals, round_curr
from app.modules.finance.domain.matching_engine import match_three_way
from app.modules.finance.infrastructure.api.schemas import (
    APAgingBucket,
    APAgingResponse,
    BudgetCheckResponse,
    FinanceAdjustmentCreate,
    FinanceDashboardSummary,
    PaymentCreate,
    POHoldRequest,
    SupplierInvoiceCreate,
)
from app.modules.finance.infrastructure.persistence.models import (
    DepartmentBudgetModel,
    FinanceAdjustmentModel,
    FinanceAuditEventModel,
    FinanceExceptionModel,
    InvoiceMatchModel,
    PaymentAllocationModel,
    PaymentModel,
    SupplierInvoiceItemModel,
    SupplierInvoiceModel,
)
from app.modules.procurement.infrastructure.persistence.models import (
    POApprovalHistoryModel,
    PurchaseOrderItemModel,
    PurchaseOrderModel,
    SupplierModel,
)
from app.modules.receiving.infrastructure.persistence.models import (
    GrnLineModel,
    GrnModel,
)
from app.security.dependencies import CurrentUser


class FinanceService:
    # -------------------------------------------------------------
    # 1. PO Finance Approvals, Budget Checks & Holds
    # -------------------------------------------------------------
    @staticmethod
    async def record_audit_event(
        db: AsyncSession,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID,
        entity_number: str,
        user: CurrentUser,
        previous_status: Optional[str] = None,
        new_status: Optional[str] = None,
        reason: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> FinanceAuditEventModel:
        event = FinanceAuditEventModel(
            id=uuid.uuid4(),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_number=entity_number,
            user_username=user.username if user else "system",
            user_role=",".join(user.roles) if user and user.roles else "FINANCE",
            previous_status=previous_status,
            new_status=new_status,
            reason=reason,
            details=details,
            timestamp=datetime.utcnow(),
        )
        db.add(event)
        return event

    @staticmethod
    async def check_po_budget(db: AsyncSession, po_id: uuid.UUID) -> BudgetCheckResponse:
        po_stmt = select(PurchaseOrderModel).where(PurchaseOrderModel.id == po_id)
        po_res = await db.execute(po_stmt)
        po = po_res.scalar_one_or_none()
        if not po:
            raise ValueError(f"Purchase Order {po_id} not found")

        po_amount = float(po.total_amount or 0.0)
        # Determine department; default to "Warehouse Operations" if not specified
        dept_name = "Warehouse Operations"
        if hasattr(po, "department") and getattr(po, "department"):
            dept_name = getattr(po, "department")

        # Query department budget
        b_stmt = select(DepartmentBudgetModel).where(
            and_(
                DepartmentBudgetModel.department == dept_name,
                DepartmentBudgetModel.status == "ACTIVE"
            )
        ).order_by(desc(DepartmentBudgetModel.financial_year))
        b_res = await db.execute(b_stmt)
        budget = b_res.scalars().first()

        if not budget:
            # Fallback to any active budget
            b_stmt2 = select(DepartmentBudgetModel).where(DepartmentBudgetModel.status == "ACTIVE").limit(1)
            b_res2 = await db.execute(b_stmt2)
            budget = b_res2.scalars().first()

        if not budget:
            # No budget configured fallback
            allocated = 0.0
            committed = 0.0
            consumed = 0.0
            fy = f"{date.today().year}-{date.today().year + 1}"
            cat = "Unallocated"
        else:
            allocated = float(budget.allocated_amount or 0.0)
            committed = float(budget.committed_amount or 0.0)
            consumed = float(budget.consumed_amount or 0.0)
            fy = budget.financial_year
            cat = budget.budget_category

        available = round_curr(allocated - (committed + consumed))
        remaining = round_curr(available - po_amount)

        if remaining < 0:
            status = "EXCEEDED"
            msg = f"PO amount ₹{po_amount:,.2f} exceeds available budget ₹{available:,.2f} by ₹{abs(remaining):,.2f}."
        elif (committed + consumed + po_amount) / (allocated or 1.0) > 0.85:
            status = "WARNING"
            msg = f"PO will consume >85% of allocated department budget. Available remaining: ₹{remaining:,.2f}."
        else:
            status = "SUFFICIENT"
            msg = f"Budget is sufficient. Available after PO: ₹{remaining:,.2f}."

        return BudgetCheckResponse(
            department=dept_name,
            financial_year=fy,
            budget_category=cat,
            allocated_amount=allocated,
            committed_amount=committed,
            consumed_amount=consumed,
            available_amount=available,
            po_amount=po_amount,
            remaining_after_po=remaining,
            status=status,
            warning_message=msg,
        )

    @staticmethod
    async def put_po_on_hold(
        db: AsyncSession, po_id: uuid.UUID, hold_req: POHoldRequest, user: CurrentUser
    ) -> Dict[str, Any]:
        stmt = select(PurchaseOrderModel).where(PurchaseOrderModel.id == po_id)
        res = await db.execute(stmt)
        po = res.scalar_one_or_none()
        if not po:
            raise ValueError(f"Purchase Order {po_id} not found")

        prev_status = po.status
        po.status = "FINANCE_HOLD"
        held_by = user.username if user else "system"
        held_at = datetime.utcnow()

        # Audit
        await FinanceService.record_audit_event(
            db=db,
            action="PO_HOLD",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            entity_number=po.po_number,
            user=user,
            previous_status=prev_status,
            new_status="FINANCE_HOLD",
            reason=f"{hold_req.hold_reason}: {hold_req.hold_comment or ''}",
        )

        # Create Finance Exception
        exc = FinanceExceptionModel(
            id=uuid.uuid4(),
            exception_type=hold_req.hold_reason,
            severity="HIGH" if hold_req.hold_reason == "BUDGET_EXCEEDED" else "MEDIUM",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            entity_number=po.po_number,
            supplier_id=po.supplier_id,
            variance_amount=Decimal(str(po.total_amount or 0.0)),
            reason=hold_req.hold_comment or hold_req.hold_reason,
            status="OPEN",
        )
        db.add(exc)

        # Record PO Approval History entry
        po_history = POApprovalHistoryModel(
            id=uuid.uuid4(),
            purchase_order_id=po.id,
            status="FINANCE_HOLD",
            actor_name=user.username if user else "finance_officer",
            comments=f"Put on Hold ({hold_req.hold_reason}): {hold_req.hold_comment or ''}".strip(),
            created_at=datetime.utcnow(),
        )
        db.add(po_history)

        await db.commit()

        return {
            "po_id": str(po.id),
            "po_number": po.po_number,
            "status": po.status,
            "hold_reason": hold_req.hold_reason,
            "hold_comment": hold_req.hold_comment,
            "held_by": held_by,
            "held_at": held_at.isoformat(),
        }

    @staticmethod
    async def release_po_hold(
        db: AsyncSession, po_id: uuid.UUID, resolution_notes: str, user: CurrentUser
    ) -> Dict[str, Any]:
        stmt = select(PurchaseOrderModel).where(PurchaseOrderModel.id == po_id)
        res = await db.execute(stmt)
        po = res.scalar_one_or_none()
        if not po:
            raise ValueError(f"Purchase Order {po_id} not found")

        prev_status = po.status
        po.status = "PENDING_FINANCE_APPROVAL"

        await FinanceService.record_audit_event(
            db=db,
            action="PO_HOLD_RELEASED",
            entity_type="PURCHASE_ORDER",
            entity_id=po.id,
            entity_number=po.po_number,
            user=user,
            previous_status=prev_status,
            new_status="PENDING_FINANCE_APPROVAL",
            reason=f"Released from hold: {resolution_notes}",
        )

        # Close any open exceptions for this PO
        exc_stmt = select(FinanceExceptionModel).where(
            and_(
                FinanceExceptionModel.entity_id == po.id,
                FinanceExceptionModel.status == "OPEN"
            )
        )
        exc_res = await db.execute(exc_stmt)
        for e in exc_res.scalars().all():
            e.status = "RESOLVED"
            e.resolution_comment = resolution_notes
            e.resolved_by = user.username if user else "system"
            e.resolved_at = datetime.utcnow()

        # Record PO Approval History entry
        po_history = POApprovalHistoryModel(
            id=uuid.uuid4(),
            purchase_order_id=po.id,
            status="PENDING_FINANCE_APPROVAL",
            actor_name=user.username if user else "finance_officer",
            comments=f"Released from Hold: {resolution_notes}".strip(),
            created_at=datetime.utcnow(),
        )
        db.add(po_history)

        await db.commit()
        return {
            "po_id": str(po.id),
            "po_number": po.po_number,
            "status": po.status,
            "message": "PO hold successfully released and returned to approval queue.",
        }

    # -------------------------------------------------------------
    # 2. Supplier Invoices & Line Items
    # -------------------------------------------------------------
    @staticmethod
    async def create_invoice(
        db: AsyncSession, invoice_in: SupplierInvoiceCreate, user: CurrentUser
    ) -> SupplierInvoiceModel:
        # Check uniqueness of supplier_id + invoice_number
        dup_stmt = select(SupplierInvoiceModel).where(
            and_(
                SupplierInvoiceModel.supplier_id == invoice_in.supplier_id,
                SupplierInvoiceModel.invoice_number == invoice_in.invoice_number.strip(),
            )
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise ValueError(
                f"Invoice number '{invoice_in.invoice_number}' already exists for this supplier."
            )

        # Convert line items dicts for calculation
        raw_items = [item.model_dump() for item in invoice_in.items]
        totals = calculate_invoice_totals(
            items=raw_items,
            discount_amount=invoice_in.discount_amount,
            tax_amount=invoice_in.tax_amount,
            freight_charges=invoice_in.freight_charges,
            additional_charges=invoice_in.other_charges,
            paid_amount=0.0,
        )

        inv = SupplierInvoiceModel(
            id=uuid.uuid4(),
            invoice_number=invoice_in.invoice_number.strip(),
            supplier_id=invoice_in.supplier_id,
            po_id=invoice_in.po_id,
            grn_id=invoice_in.grn_id,
            invoice_date=invoice_in.invoice_date,
            due_date=invoice_in.due_date,
            currency=invoice_in.currency,
            payment_terms=invoice_in.payment_terms,
            subtotal=Decimal(str(totals["subtotal"])),
            discount_amount=Decimal(str(totals["discount_amount"])),
            tax_amount=Decimal(str(totals["tax_amount"])),
            freight_charges=Decimal(str(totals["freight_charges"])),
            other_charges=Decimal(str(totals["additional_charges"])),
            grand_total=Decimal(str(totals["total_amount"])),
            paid_amount=Decimal("0.0"),
            outstanding_amount=Decimal(str(totals["total_amount"])),
            status="RECEIVED",
            match_status="PENDING",
            notes=invoice_in.notes,
            created_by=user.username if user else "system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(inv)

        # Add items
        for item in invoice_in.items:
            qty = Decimal(str(item.quantity))
            price = Decimal(str(item.unit_price))
            disc = Decimal(str(item.discount or 0.0))
            tax = Decimal(str(item.tax or 0.0))
            line_tot = Decimal(str(round_curr(float(qty * price - disc + tax))))

            item_model = SupplierInvoiceItemModel(
                id=uuid.uuid4(),
                invoice_id=inv.id,
                material_id=item.material_id,
                material_code=item.material_code,
                material_name=item.material_name,
                description=item.description,
                quantity=qty,
                uom=item.uom,
                unit_price=price,
                discount=disc,
                tax=tax,
                line_total=line_tot,
                po_item_id=item.po_item_id,
                grn_line_id=item.grn_line_id,
            )
            db.add(item_model)

        await db.flush()

        await FinanceService.record_audit_event(
            db=db,
            action="INVOICE_CREATED",
            entity_type="SUPPLIER_INVOICE",
            entity_id=inv.id,
            entity_number=inv.invoice_number,
            user=user,
            new_status="RECEIVED",
            reason="Supplier Invoice registered in P2P Finance",
            details={"grand_total": totals["total_amount"], "items_count": len(invoice_in.items)},
        )

        await db.commit()

        # Auto-match if linked to PO and/or GRN
        if inv.po_id or inv.grn_id:
            await FinanceService.execute_matching(db=db, invoice_id=inv.id, user=user)

        # Return loaded invoice
        return await FinanceService.get_invoice_by_id(db=db, invoice_id=inv.id)

    @staticmethod
    async def get_invoice_by_id(db: AsyncSession, invoice_id: uuid.UUID) -> Optional[SupplierInvoiceModel]:
        stmt = (
            select(SupplierInvoiceModel)
            .where(SupplierInvoiceModel.id == invoice_id)
            .options(
                selectinload(SupplierInvoiceModel.items),
                selectinload(SupplierInvoiceModel.matches),
                selectinload(SupplierInvoiceModel.allocations),
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_invoices(
        db: AsyncSession,
        status: Optional[str] = None,
        match_status: Optional[str] = None,
        supplier_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[SupplierInvoiceModel]:
        stmt = (
            select(SupplierInvoiceModel)
            .options(
                selectinload(SupplierInvoiceModel.items),
                selectinload(SupplierInvoiceModel.matches),
            )
            .order_by(desc(SupplierInvoiceModel.created_at))
        )
        filters = []
        if status:
            filters.append(SupplierInvoiceModel.status == status)
        if match_status:
            filters.append(SupplierInvoiceModel.match_status == match_status)
        if supplier_id:
            filters.append(SupplierInvoiceModel.supplier_id == supplier_id)
        if search:
            filters.append(
                or_(
                    SupplierInvoiceModel.invoice_number.ilike(f"%{search}%"),
                    SupplierInvoiceModel.notes.ilike(f"%{search}%"),
                )
            )
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.limit(limit).offset(offset)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    # -------------------------------------------------------------
    # 3. 3-Way Matching Engine Execution
    # -------------------------------------------------------------
    @staticmethod
    async def execute_matching(
        db: AsyncSession,
        invoice_id: uuid.UUID,
        user: CurrentUser,
        price_tolerance_pct: float = 2.0,
    ) -> InvoiceMatchModel:
        inv = await FinanceService.get_invoice_by_id(db=db, invoice_id=invoice_id)
        if not inv:
            raise ValueError(f"Supplier invoice {invoice_id} not found")

        po_items = []
        po_total = 0.0
        po_number = ""
        if inv.po_id:
            po_stmt = (
                select(PurchaseOrderModel)
                .where(PurchaseOrderModel.id == inv.po_id)
                .options(selectinload(PurchaseOrderModel.items))
            )
            po_res = await db.execute(po_stmt)
            po = po_res.scalar_one_or_none()
            if po:
                po_number = po.po_number
                po_total = float(po.total_amount or 0.0)
                for item in po.items:
                    po_items.append({
                        "id": str(item.id),
                        "material_id": str(item.material_id) if item.material_id else None,
                        "item_code": item.material_code,
                        "item_name": item.material_name,
                        "quantity": float(item.quantity),
                        "unit_price": float(item.unit_price),
                    })

        grn_lines = []
        grn_id_to_use = inv.grn_id
        if not grn_id_to_use and inv.po_id:
            # Look up GRN linked to this PO
            grn_stmt = select(GrnModel).where(GrnModel.purchase_order_id == inv.po_id).order_by(desc(GrnModel.created_at))
            grn_res = await db.execute(grn_stmt)
            grn = grn_res.scalars().first()
            if grn:
                grn_id_to_use = grn.id

        if grn_id_to_use:
            grn_lines_stmt = select(GrnLineModel).where(GrnLineModel.grn_id == grn_id_to_use)
            grn_lines_res = await db.execute(grn_lines_stmt)
            for gl in grn_lines_res.scalars().all():
                grn_lines.append({
                    "id": str(gl.id),
                    "item_code": gl.item_code,
                    "item_name": gl.material_name,
                    "received_quantity": float(gl.received_quantity or 0.0),
                    "good_quantity": float(gl.good_quantity if gl.good_quantity is not None else gl.received_quantity or 0.0),
                    "damaged_quantity": float(gl.damaged_quantity or 0.0),
                })

        invoice_items = []
        for it in inv.items:
            invoice_items.append({
                "id": str(it.id),
                "material_id": str(it.material_id) if it.material_id else None,
                "item_code": it.material_code,
                "item_name": it.material_name,
                "quantity": float(it.quantity),
                "unit_price": float(it.unit_price),
                "line_total": float(it.line_total),
            })

        match_res = match_three_way(
            invoice_items=invoice_items,
            po_items=po_items,
            grn_lines=grn_lines,
            invoice_grand_total=float(inv.grand_total or 0.0),
            po_grand_total=po_total,
            price_tolerance_pct=price_tolerance_pct,
        )

        # Save Match Model
        match_record = InvoiceMatchModel(
            id=uuid.uuid4(),
            invoice_id=inv.id,
            po_id=inv.po_id,
            grn_id=grn_id_to_use,
            match_status=match_res.match_status,
            po_quantity_total=Decimal(str(sum(p["quantity"] for p in po_items))),
            grn_quantity_total=Decimal(str(sum(g["good_quantity"] for g in grn_lines))),
            invoice_quantity_total=Decimal(str(sum(i["quantity"] for i in invoice_items))),
            quantity_variance=Decimal(str(abs(sum(i["quantity"] for i in invoice_items) - sum(g["good_quantity"] for g in grn_lines)))),
            price_variance=Decimal(str(match_res.discrepancy_amount)),
            tax_variance=Decimal("0.0"),
            total_variance=Decimal(str(match_res.discrepancy_amount)),
            tolerance_percentage=Decimal(str(price_tolerance_pct)),
            exception_reason="; ".join(e["message"] for e in match_res.exceptions) if match_res.exceptions else None,
            exception_details=match_res.to_dict(),
            matched_by=user.username if user else "system",
            matched_at=datetime.utcnow(),
        )
        db.add(match_record)

        # Update invoice
        inv.match_status = match_res.match_status
        inv.grn_id = grn_id_to_use
        if match_res.match_status == "DISCREPANCY":
            inv.status = "DISCREPANCY"
            # Create exception records
            for exc in match_res.exceptions:
                fe = FinanceExceptionModel(
                    id=uuid.uuid4(),
                    exception_type=exc.get("exception_type", "MATCH_DISCREPANCY"),
                    severity=exc.get("severity", "HIGH"),
                    entity_type="SUPPLIER_INVOICE",
                    entity_id=inv.id,
                    entity_number=inv.invoice_number,
                    supplier_id=inv.supplier_id,
                    variance_amount=Decimal(str(exc.get("variance_amount", 0.0))),
                    reason=exc.get("message", "Discrepancy in 3-way match"),
                    status="OPEN",
                )
                db.add(fe)
        elif match_res.match_status in ("MATCHED", "TOLERANCE_WARNING"):
            if inv.status in ("RECEIVED", "PENDING", "DISCREPANCY"):
                inv.status = "READY_FOR_APPROVAL"

        await FinanceService.record_audit_event(
            db=db,
            action="THREE_WAY_MATCH_RUN",
            entity_type="SUPPLIER_INVOICE",
            entity_id=inv.id,
            entity_number=inv.invoice_number,
            user=user,
            new_status=inv.status,
            reason=f"3-Way Match completed with status {match_res.match_status}",
            details={"match_status": match_res.match_status, "discrepancy": match_res.discrepancy_amount},
        )

        await db.commit()
        return match_record

    @staticmethod
    async def override_match_discrepancy(
        db: AsyncSession,
        invoice_id: uuid.UUID,
        override_reason: str,
        user: CurrentUser,
    ) -> InvoiceMatchModel:
        inv = await FinanceService.get_invoice_by_id(db=db, invoice_id=invoice_id)
        if not inv:
            raise ValueError(f"Supplier invoice {invoice_id} not found")

        # Find latest match
        stmt = (
            select(InvoiceMatchModel)
            .where(InvoiceMatchModel.invoice_id == invoice_id)
            .order_by(desc(InvoiceMatchModel.matched_at))
        )
        res = await db.execute(stmt)
        match_record = res.scalars().first()
        if not match_record:
            raise ValueError("No match record found to override")

        prev_status = match_record.match_status
        match_record.match_status = "OVERRIDDEN"
        match_record.override_by = user.username if user else "finance_manager"
        match_record.override_reason = override_reason
        match_record.override_at = datetime.utcnow()

        inv.match_status = "OVERRIDDEN"
        inv.status = "READY_FOR_APPROVAL"

        # Resolve open exceptions for this invoice
        exc_stmt = select(FinanceExceptionModel).where(
            and_(
                FinanceExceptionModel.entity_id == inv.id,
                FinanceExceptionModel.status == "OPEN"
            )
        )
        exc_res = await db.execute(exc_stmt)
        for e in exc_res.scalars().all():
            e.status = "RESOLVED"
            e.resolution_comment = f"Overridden by {user.username}: {override_reason}"
            e.resolved_by = user.username
            e.resolved_at = datetime.utcnow()

        await FinanceService.record_audit_event(
            db=db,
            action="MATCH_OVERRIDE",
            entity_type="SUPPLIER_INVOICE",
            entity_id=inv.id,
            entity_number=inv.invoice_number,
            user=user,
            previous_status=prev_status,
            new_status="OVERRIDDEN",
            reason=override_reason,
        )

        await db.commit()
        return match_record

    # -------------------------------------------------------------
    # 4. AP Approvals, Rejections, Holds
    # -------------------------------------------------------------
    @staticmethod
    async def approve_or_reject_invoice(
        db: AsyncSession,
        invoice_id: uuid.UUID,
        approved: bool,
        user: CurrentUser,
        notes: Optional[str] = None,
        rejection_reason: Optional[str] = None,
    ) -> SupplierInvoiceModel:
        inv = await FinanceService.get_invoice_by_id(db=db, invoice_id=invoice_id)
        if not inv:
            raise ValueError(f"Supplier invoice {invoice_id} not found")

        prev_status = inv.status
        if approved:
            inv.status = "APPROVED"
            inv.approved_by = user.username if user else "finance_officer"
            inv.approved_at = datetime.utcnow()
            action = "INVOICE_APPROVED"
            reason = notes or "AP Invoice Approved for Payment"
        else:
            inv.status = "REJECTED"
            inv.rejection_reason = rejection_reason or notes or "Rejected by Finance"
            action = "INVOICE_REJECTED"
            reason = inv.rejection_reason

        inv.updated_by = user.username if user else "system"
        inv.updated_at = datetime.utcnow()

        await FinanceService.record_audit_event(
            db=db,
            action=action,
            entity_type="SUPPLIER_INVOICE",
            entity_id=inv.id,
            entity_number=inv.invoice_number,
            user=user,
            previous_status=prev_status,
            new_status=inv.status,
            reason=reason,
        )

        await db.commit()
        return inv

    @staticmethod
    async def hold_invoice(
        db: AsyncSession,
        invoice_id: uuid.UUID,
        hold_reason: str,
        hold_comment: Optional[str],
        user: CurrentUser,
    ) -> SupplierInvoiceModel:
        inv = await FinanceService.get_invoice_by_id(db=db, invoice_id=invoice_id)
        if not inv:
            raise ValueError(f"Supplier invoice {invoice_id} not found")

        prev_status = inv.status
        inv.status = "ON_HOLD"
        inv.hold_reason = hold_reason
        inv.hold_comment = hold_comment
        inv.updated_by = user.username if user else "system"
        inv.updated_at = datetime.utcnow()

        await FinanceService.record_audit_event(
            db=db,
            action="INVOICE_HOLD",
            entity_type="SUPPLIER_INVOICE",
            entity_id=inv.id,
            entity_number=inv.invoice_number,
            user=user,
            previous_status=prev_status,
            new_status="ON_HOLD",
            reason=f"{hold_reason}: {hold_comment or ''}",
        )

        await db.commit()
        return inv

    # -------------------------------------------------------------
    # 5. Payment Processing & Multi-Invoice Allocations
    # -------------------------------------------------------------
    @staticmethod
    async def process_payment(
        db: AsyncSession,
        payment_in: PaymentCreate,
        user: CurrentUser,
    ) -> PaymentModel:
        # Generate payment reference if not given
        pref = payment_in.payment_reference
        if not pref:
            date_str = payment_in.payment_date.strftime("%Y%m%d")
            rand_suffix = uuid.uuid4().hex[:6].upper()
            pref = f"PAY-{date_str}-{rand_suffix}"

        pay_amt = Decimal(str(round_curr(payment_in.amount)))
        allocated_total = Decimal("0.0")

        pay = PaymentModel(
            id=uuid.uuid4(),
            payment_reference=pref,
            supplier_id=payment_in.supplier_id,
            payment_date=payment_in.payment_date,
            amount=pay_amt,
            allocated_amount=Decimal("0.0"),
            unallocated_amount=pay_amt,
            currency=payment_in.currency,
            payment_method=payment_in.payment_method,
            transaction_reference=payment_in.transaction_reference,
            bank_reference=payment_in.bank_reference,
            bank_name=payment_in.bank_name,
            status="COMPLETED",
            notes=payment_in.notes,
            created_by=user.username if user else "system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(pay)
        await db.flush()

        # Handle allocations
        for alloc in payment_in.allocations:
            alloc_amt = Decimal(str(round_curr(alloc.allocated_amount)))
            if alloc_amt <= 0:
                continue

            inv_stmt = select(SupplierInvoiceModel).where(SupplierInvoiceModel.id == alloc.invoice_id)
            inv_res = await db.execute(inv_stmt)
            inv = inv_res.scalar_one_or_none()
            if not inv:
                raise ValueError(f"Allocated invoice {alloc.invoice_id} not found")

            # Validate allocation doesn't exceed invoice outstanding (Overpayment Prevention)
            curr_outstanding = Decimal(str(inv.outstanding_amount or 0.0))
            if alloc_amt > curr_outstanding:
                raise ValueError(
                    f"Allocated amount {alloc_amt} exceeds invoice outstanding amount {curr_outstanding} for invoice {inv.invoice_number}"
                )

            allocated_total += alloc_amt

            # Update invoice paid & outstanding
            prev_status = inv.status
            new_paid = Decimal(str(inv.paid_amount or 0.0)) + alloc_amt
            new_outstanding = Decimal(str(inv.grand_total or 0.0)) - new_paid
            if new_outstanding < Decimal("0.0"):
                new_outstanding = Decimal("0.0")

            inv.paid_amount = new_paid
            inv.outstanding_amount = new_outstanding

            if new_outstanding == Decimal("0.0"):
                inv.status = "PAID"
            elif new_paid > Decimal("0.0"):
                inv.status = "PARTIALLY_PAID"

            inv.updated_at = datetime.utcnow()

            # Record allocation row
            alloc_record = PaymentAllocationModel(
                id=uuid.uuid4(),
                payment_id=pay.id,
                invoice_id=inv.id,
                allocated_amount=alloc_amt,
                notes=alloc.notes,
                allocated_by=user.username if user else "system",
                allocated_at=datetime.utcnow(),
            )
            db.add(alloc_record)

            await FinanceService.record_audit_event(
                db=db,
                action="PAYMENT_ALLOCATED",
                entity_type="SUPPLIER_INVOICE",
                entity_id=inv.id,
                entity_number=inv.invoice_number,
                user=user,
                previous_status=prev_status,
                new_status=inv.status,
                reason=f"Payment {pay.payment_reference} applied: ₹{float(alloc_amt):,.2f}",
                details={"allocated_amount": float(alloc_amt), "payment_id": str(pay.id)},
            )

        pay.allocated_amount = allocated_total
        pay.unallocated_amount = max(Decimal("0.0"), pay_amt - allocated_total)

        await FinanceService.record_audit_event(
            db=db,
            action="PAYMENT_CREATED",
            entity_type="PAYMENT",
            entity_id=pay.id,
            entity_number=pay.payment_reference,
            user=user,
            new_status="COMPLETED",
            reason=f"Payment of ₹{float(pay_amt):,.2f} recorded via {pay.payment_method}",
            details={"total": float(pay_amt), "allocated": float(allocated_total)},
        )

        await db.commit()

        # Reload payment with relations
        pay_stmt = (
            select(PaymentModel)
            .where(PaymentModel.id == pay.id)
            .options(selectinload(PaymentModel.allocations))
        )
        pay_reloaded = await db.execute(pay_stmt)
        return pay_reloaded.scalar_one()

    @staticmethod
    async def list_payments(
        db: AsyncSession,
        supplier_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[PaymentModel]:
        stmt = (
            select(PaymentModel)
            .options(selectinload(PaymentModel.allocations))
            .order_by(desc(PaymentModel.payment_date), desc(PaymentModel.created_at))
        )
        filters = []
        if supplier_id:
            filters.append(PaymentModel.supplier_id == supplier_id)
        if search:
            filters.append(
                or_(
                    PaymentModel.payment_reference.ilike(f"%{search}%"),
                    PaymentModel.transaction_reference.ilike(f"%{search}%"),
                    PaymentModel.bank_reference.ilike(f"%{search}%"),
                )
            )
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.limit(limit).offset(offset)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    # -------------------------------------------------------------
    # 6. Credit & Debit Notes (Adjustments)
    # -------------------------------------------------------------
    @staticmethod
    async def create_adjustment(
        db: AsyncSession,
        adj_in: FinanceAdjustmentCreate,
        user: CurrentUser,
    ) -> FinanceAdjustmentModel:
        note_num = adj_in.note_number
        if not note_num:
            prefix = "CN" if adj_in.note_type == "CREDIT_NOTE" else "DN"
            note_num = f"{prefix}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        amt = Decimal(str(round_curr(adj_in.amount)))
        tax = Decimal(str(round_curr(adj_in.tax_amount)))
        tot = amt + tax

        adj = FinanceAdjustmentModel(
            id=uuid.uuid4(),
            note_type=adj_in.note_type,
            note_number=note_num,
            supplier_id=adj_in.supplier_id,
            invoice_id=adj_in.invoice_id,
            amount=amt,
            tax_amount=tax,
            total_amount=tot,
            reason=adj_in.reason,
            status="APPROVED",
            note_date=adj_in.note_date,
            created_by=user.username if user else "system",
            approved_by=user.username if user else "finance_manager",
            approved_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(adj)

        # If linked to an invoice, adjust invoice outstanding
        if adj_in.invoice_id:
            inv_stmt = select(SupplierInvoiceModel).where(SupplierInvoiceModel.id == adj_in.invoice_id)
            inv_res = await db.execute(inv_stmt)
            inv = inv_res.scalar_one_or_none()
            if inv:
                curr_out = Decimal(str(inv.outstanding_amount or 0.0))
                if adj_in.note_type == "CREDIT_NOTE":
                    new_out = max(Decimal("0.0"), curr_out - tot)
                else:  # DEBIT_NOTE
                    new_out = curr_out + tot
                inv.outstanding_amount = new_out
                inv.updated_at = datetime.utcnow()

        await FinanceService.record_audit_event(
            db=db,
            action=f"{adj_in.note_type}_CREATED",
            entity_type="FINANCE_ADJUSTMENT",
            entity_id=adj.id,
            entity_number=adj.note_number,
            user=user,
            new_status="APPROVED",
            reason=adj_in.reason,
            details={"total_amount": float(tot), "type": adj_in.note_type},
        )

        await db.commit()
        return adj

    @staticmethod
    async def list_adjustments(
        db: AsyncSession,
        supplier_id: Optional[uuid.UUID] = None,
        note_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[FinanceAdjustmentModel]:
        stmt = select(FinanceAdjustmentModel).order_by(desc(FinanceAdjustmentModel.note_date), desc(FinanceAdjustmentModel.created_at))
        filters = []
        if supplier_id:
            filters.append(FinanceAdjustmentModel.supplier_id == supplier_id)
        if note_type:
            filters.append(FinanceAdjustmentModel.note_type == note_type)
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.limit(limit).offset(offset)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    # -------------------------------------------------------------
    # 7. Supplier Statements & Reports
    # -------------------------------------------------------------
    @staticmethod
    async def get_supplier_statement(
        db: AsyncSession,
        supplier_id: uuid.UUID,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        supp_stmt = select(SupplierModel).where(SupplierModel.id == supplier_id)
        supp_res = await db.execute(supp_stmt)
        supplier = supp_res.scalar_one_or_none()
        if not supplier:
            raise ValueError(f"Supplier {supplier_id} not found")

        # 1. Fetch Invoices
        inv_stmt = select(SupplierInvoiceModel).where(SupplierInvoiceModel.supplier_id == supplier_id)
        if from_date:
            inv_stmt = inv_stmt.where(SupplierInvoiceModel.invoice_date >= from_date)
        if to_date:
            inv_stmt = inv_stmt.where(SupplierInvoiceModel.invoice_date <= to_date)
        inv_res = await db.execute(inv_stmt)
        invoices = inv_res.scalars().all()

        # 2. Fetch Payments
        pay_stmt = select(PaymentModel).where(PaymentModel.supplier_id == supplier_id)
        if from_date:
            pay_stmt = pay_stmt.where(PaymentModel.payment_date >= from_date)
        if to_date:
            pay_stmt = pay_stmt.where(PaymentModel.payment_date <= to_date)
        pay_res = await db.execute(pay_stmt)
        payments = pay_res.scalars().all()

        # 3. Fetch Adjustments
        adj_stmt = select(FinanceAdjustmentModel).where(FinanceAdjustmentModel.supplier_id == supplier_id)
        if from_date:
            adj_stmt = adj_stmt.where(FinanceAdjustmentModel.note_date >= from_date)
        if to_date:
            adj_stmt = adj_stmt.where(FinanceAdjustmentModel.note_date <= to_date)
        adj_res = await db.execute(adj_stmt)
        adjustments = adj_res.scalars().all()

        # Combine into timeline entries
        raw_events = []
        for inv in invoices:
            raw_events.append({
                "date": inv.invoice_date,
                "type": "INVOICE",
                "reference_number": inv.invoice_number,
                "description": f"Invoice: {inv.invoice_number} (PO: {inv.po_id or 'Direct'})",
                "debit": float(inv.grand_total or 0.0),  # Invoiced increases AP balance
                "credit": 0.0,
            })

        for p in payments:
            raw_events.append({
                "date": p.payment_date,
                "type": "PAYMENT",
                "reference_number": p.payment_reference,
                "description": f"Payment via {p.payment_method} ({p.transaction_reference or p.payment_reference})",
                "debit": 0.0,
                "credit": float(p.amount or 0.0),  # Payment decreases AP balance
            })

        for a in adjustments:
            tot = float(a.total_amount or 0.0)
            if a.note_type == "CREDIT_NOTE":
                raw_events.append({
                    "date": a.note_date,
                    "type": "CREDIT_NOTE",
                    "reference_number": a.note_number,
                    "description": f"Credit Note: {a.reason}",
                    "debit": 0.0,
                    "credit": tot,
                })
            else:
                raw_events.append({
                    "date": a.note_date,
                    "type": "DEBIT_NOTE",
                    "reference_number": a.note_number,
                    "description": f"Debit Note: {a.reason}",
                    "debit": tot,
                    "credit": 0.0,
                })

        raw_events.sort(key=lambda x: x["date"])

        running = 0.0
        statement_entries = []
        total_invoiced = 0.0
        total_paid = 0.0
        total_adj = 0.0

        for ev in raw_events:
            if ev["type"] == "INVOICE":
                total_invoiced += ev["debit"]
            elif ev["type"] == "PAYMENT":
                total_paid += ev["credit"]
            elif ev["type"] == "CREDIT_NOTE":
                total_adj += ev["credit"]
            elif ev["type"] == "DEBIT_NOTE":
                total_adj -= ev["debit"]

            running += (ev["debit"] - ev["credit"])
            statement_entries.append({
                "date": ev["date"].isoformat(),
                "type": ev["type"],
                "reference_number": ev["reference_number"],
                "description": ev["description"],
                "debit": round_curr(ev["debit"]),
                "credit": round_curr(ev["credit"]),
                "running_balance": round_curr(running),
            })

        return {
            "supplier_id": str(supplier.id),
            "supplier_code": getattr(supplier, "supplier_code", getattr(supplier, "code", None)),
            "supplier_name": getattr(supplier, "supplier_name", getattr(supplier, "name", None)),
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
            "total_invoiced": round_curr(total_invoiced),
            "total_paid": round_curr(total_paid),
            "total_adjustments": round_curr(total_adj),
            "closing_balance": round_curr(running),
            "entries": statement_entries,
        }

    # -------------------------------------------------------------
    # 8. Accounts Payable (AP) Aging Report
    # -------------------------------------------------------------
    @staticmethod
    async def get_ap_aging(db: AsyncSession, as_of_date: Optional[date] = None) -> APAgingResponse:
        ref_date = as_of_date or date.today()

        # Query all invoices that have outstanding amounts and are not REJECTED or DRAFT
        stmt = (
            select(SupplierInvoiceModel)
            .where(
                and_(
                    SupplierInvoiceModel.outstanding_amount > 0,
                    SupplierInvoiceModel.status.in_(["APPROVED", "PARTIALLY_PAID", "RECEIVED", "READY_FOR_APPROVAL", "ON_HOLD"])
                )
            )
            .order_by(SupplierInvoiceModel.due_date)
        )
        res = await db.execute(stmt)
        invoices = res.scalars().all()

        current_bucket = {"label": "Current (0-30 days)", "count": 0, "amount": 0.0}
        b31_60 = {"label": "31-60 days past due", "count": 0, "amount": 0.0}
        b61_90 = {"label": "61-90 days past due", "count": 0, "amount": 0.0}
        over_90 = {"label": "90+ days past due", "count": 0, "amount": 0.0}

        inv_details = []
        total_outstanding = 0.0

        for inv in invoices:
            out_amt = float(inv.outstanding_amount or 0.0)
            total_outstanding += out_amt
            days_overdue = (ref_date - inv.due_date).days

            if days_overdue <= 0:
                # Not overdue or due today
                current_bucket["count"] += 1
                current_bucket["amount"] += out_amt
                bucket_name = "Current"
            elif 1 <= days_overdue <= 30:
                current_bucket["count"] += 1
                current_bucket["amount"] += out_amt
                bucket_name = "0-30 Days"
            elif 31 <= days_overdue <= 60:
                b31_60["count"] += 1
                b31_60["amount"] += out_amt
                bucket_name = "31-60 Days"
            elif 61 <= days_overdue <= 90:
                b61_90["count"] += 1
                b61_90["amount"] += out_amt
                bucket_name = "61-90 Days"
            else:
                over_90["count"] += 1
                over_90["amount"] += out_amt
                bucket_name = "90+ Days"

            inv_details.append({
                "invoice_id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "supplier_id": str(inv.supplier_id),
                "invoice_date": inv.invoice_date.isoformat(),
                "due_date": inv.due_date.isoformat(),
                "grand_total": float(inv.grand_total or 0.0),
                "outstanding_amount": out_amt,
                "days_overdue": max(0, days_overdue),
                "bucket": bucket_name,
                "status": inv.status,
            })

        buckets = [
            APAgingBucket(bucket_label=current_bucket["label"], invoice_count=current_bucket["count"], total_amount=round_curr(current_bucket["amount"])),
            APAgingBucket(bucket_label=b31_60["label"], invoice_count=b31_60["count"], total_amount=round_curr(b31_60["amount"])),
            APAgingBucket(bucket_label=b61_90["label"], invoice_count=b61_90["count"], total_amount=round_curr(b61_90["amount"])),
            APAgingBucket(bucket_label=over_90["label"], invoice_count=over_90["count"], total_amount=round_curr(over_90["amount"])),
        ]

        return APAgingResponse(
            as_of_date=ref_date,
            total_outstanding=round_curr(total_outstanding),
            buckets=buckets,
            invoices=inv_details,
        )

    # -------------------------------------------------------------
    # 9. Finance Dashboard Cockpit Aggregations
    # -------------------------------------------------------------
    @staticmethod
    async def get_dashboard_summary(db: AsyncSession) -> Dict[str, Any]:
        # PO approvals pending
        po_stmt = select(
            func.count(PurchaseOrderModel.id),
            func.coalesce(func.sum(PurchaseOrderModel.total_amount), 0.0)
        ).where(PurchaseOrderModel.status.in_(["PENDING_FINANCE_APPROVAL", "SUBMITTED"]))
        po_res = await db.execute(po_stmt)
        po_cnt, po_val = po_res.one()

        # Invoices counts
        inv_counts_stmt = select(
            func.count(SupplierInvoiceModel.id),
            func.count().filter(SupplierInvoiceModel.match_status == "PENDING"),
            func.count().filter(SupplierInvoiceModel.status == "READY_FOR_APPROVAL"),
            func.count().filter(SupplierInvoiceModel.status == "APPROVED"),
            func.coalesce(func.sum(SupplierInvoiceModel.outstanding_amount), 0.0)
        )
        inv_res = await db.execute(inv_counts_stmt)
        inv_total, inv_pending_match, inv_pending_app, inv_approved_unpaid, total_ap = inv_res.one()

        # Payments this month
        first_of_month = date.today().replace(day=1)
        pay_stmt = select(
            func.coalesce(func.sum(PaymentModel.amount), 0.0)
        ).where(PaymentModel.payment_date >= first_of_month)
        pay_res = await db.execute(pay_stmt)
        payments_month = pay_res.scalar() or 0.0

        # Credit notes
        cn_stmt = select(
            func.coalesce(func.sum(FinanceAdjustmentModel.total_amount), 0.0)
        ).where(FinanceAdjustmentModel.note_type == "CREDIT_NOTE")
        cn_res = await db.execute(cn_stmt)
        credit_notes_total = cn_res.scalar() or 0.0

        # Open exceptions
        exc_stmt = select(func.count(FinanceExceptionModel.id)).where(FinanceExceptionModel.status == "OPEN")
        exc_res = await db.execute(exc_stmt)
        open_exc = exc_res.scalar() or 0

        # Budget utilization average
        budg_stmt = select(
            func.coalesce(func.sum(DepartmentBudgetModel.allocated_amount), 0.0),
            func.coalesce(func.sum(DepartmentBudgetModel.committed_amount + DepartmentBudgetModel.consumed_amount), 0.0)
        ).where(DepartmentBudgetModel.status == "ACTIVE")
        b_res = await db.execute(budg_stmt)
        alloc_sum, used_sum = b_res.one()
        budget_util_pct = round_curr((float(used_sum) / float(alloc_sum) * 100.0)) if float(alloc_sum) > 0 else 0.0

        # Enhanced Task 4 Metrics
        today = date.today()
        soon_threshold = today + timedelta(days=7)

        # Due soon: invoices with due_date between today and 7 days, with outstanding > 0
        due_soon_stmt = select(
            func.count(SupplierInvoiceModel.id),
            func.coalesce(func.sum(SupplierInvoiceModel.outstanding_amount), 0.0)
        ).where(
            and_(
                SupplierInvoiceModel.due_date >= today,
                SupplierInvoiceModel.due_date <= soon_threshold,
                SupplierInvoiceModel.outstanding_amount > 0,
                SupplierInvoiceModel.status != "REJECTED",
            )
        )
        ds_res = await db.execute(due_soon_stmt)
        due_soon_cnt, due_soon_amt = ds_res.one()

        # Overdue: due_date < today and outstanding > 0
        overdue_stmt = select(
            func.count(SupplierInvoiceModel.id),
            func.coalesce(func.sum(SupplierInvoiceModel.outstanding_amount), 0.0)
        ).where(
            and_(
                SupplierInvoiceModel.due_date < today,
                SupplierInvoiceModel.outstanding_amount > 0,
                SupplierInvoiceModel.status != "REJECTED",
            )
        )
        od_res = await db.execute(overdue_stmt)
        overdue_cnt, overdue_amt = od_res.one()

        # Payment pending: approved unpaid invoices
        payment_pending_stmt = select(
            func.count(SupplierInvoiceModel.id),
            func.coalesce(func.sum(SupplierInvoiceModel.outstanding_amount), 0.0)
        ).where(
            and_(
                SupplierInvoiceModel.status.in_(["APPROVED", "PARTIALLY_PAID"]),
                SupplierInvoiceModel.outstanding_amount > 0,
            )
        )
        pp_res = await db.execute(payment_pending_stmt)
        pp_cnt, pp_amt = pp_res.one()

        # Paid invoices
        paid_stmt = select(
            func.count(SupplierInvoiceModel.id),
            func.coalesce(func.sum(SupplierInvoiceModel.paid_amount), 0.0)
        ).where(SupplierInvoiceModel.paid_amount > 0)
        pd_res = await db.execute(paid_stmt)
        pd_cnt, pd_amt = pd_res.one()

        # On hold invoices
        on_hold_stmt = select(
            func.count(SupplierInvoiceModel.id),
            func.coalesce(func.sum(SupplierInvoiceModel.grand_total), 0.0)
        ).where(SupplierInvoiceModel.status == "ON_HOLD")
        oh_res = await db.execute(on_hold_stmt)
        oh_cnt, oh_amt = oh_res.one()

        return {
            "total_pending_po_approvals": po_cnt or 0,
            "total_pending_po_value": round_curr(po_val),
            "total_invoices_received": inv_total or 0,
            "total_invoices_pending_match": inv_pending_match or 0,
            "total_invoices_pending_approval": inv_pending_app or 0,
            "total_approved_unpaid_invoices": inv_approved_unpaid or 0,
            "total_ap_outstanding": round_curr(total_ap),
            "total_payments_this_month": round_curr(payments_month),
            "total_credit_notes_available": round_curr(credit_notes_total),
            "total_exceptions_open": open_exc,
            "budget_utilization_pct": budget_util_pct,
            # Explicit Task 4 metrics
            "pending_po_approvals": po_cnt or 0,
            "pending_po_value": round_curr(po_val),
            "pending_invoices": (inv_pending_match or 0) + (inv_pending_app or 0),
            "invoices_awaiting_approval": inv_pending_app or 0,
            "total_payable": round_curr(total_ap),
            "due_soon_count": due_soon_cnt or 0,
            "due_soon_amount": round_curr(due_soon_amt),
            "overdue_count": overdue_cnt or 0,
            "overdue_amount": round_curr(overdue_amt),
            "payment_pending_count": pp_cnt or 0,
            "payment_pending_amount": round_curr(pp_amt),
            "paid_count": pd_cnt or 0,
            "paid_amount": round_curr(pd_amt),
            "on_hold_count": oh_cnt or 0,
            "on_hold_amount": round_curr(oh_amt),
            "finance_exceptions_count": open_exc or 0,
        }

    # -------------------------------------------------------------
    # 10. Finance Exceptions
    # -------------------------------------------------------------
    @staticmethod
    async def list_exceptions(
        db: AsyncSession,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        entity_type: Optional[str] = None,
        supplier_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[FinanceExceptionModel]:
        stmt = select(FinanceExceptionModel).order_by(desc(FinanceExceptionModel.created_at))
        filters = []
        if status and status.upper() != "ALL":
            filters.append(FinanceExceptionModel.status == status.upper())
        if severity:
            filters.append(FinanceExceptionModel.severity == severity.upper())
        if entity_type:
            filters.append(FinanceExceptionModel.entity_type == entity_type.upper())
        if supplier_id:
            filters.append(FinanceExceptionModel.supplier_id == supplier_id)
        if search:
            filters.append(
                or_(
                    FinanceExceptionModel.entity_number.ilike(f"%{search}%"),
                    FinanceExceptionModel.reason.ilike(f"%{search}%"),
                    FinanceExceptionModel.exception_type.ilike(f"%{search}%"),
                )
            )
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.limit(limit).offset(offset)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def resolve_exception(
        db: AsyncSession,
        exception_id: uuid.UUID,
        resolution_comment: str,
        user: CurrentUser,
    ) -> FinanceExceptionModel:
        stmt = select(FinanceExceptionModel).where(FinanceExceptionModel.id == exception_id)
        res = await db.execute(stmt)
        exc = res.scalar_one_or_none()
        if not exc:
            raise ValueError(f"Finance exception {exception_id} not found")

        prev_status = exc.status
        exc.status = "RESOLVED"
        exc.resolution_comment = resolution_comment
        exc.resolved_by = user.username if user else "finance_officer"
        exc.resolved_at = datetime.utcnow()

        await FinanceService.record_audit_event(
            db=db,
            action="EXCEPTION_RESOLVED",
            entity_type=exc.entity_type,
            entity_id=exc.entity_id,
            entity_number=exc.entity_number,
            user=user,
            previous_status=prev_status,
            new_status="RESOLVED",
            reason=f"Exception {exc.exception_type} resolved: {resolution_comment}",
            details={"exception_id": str(exc.id), "variance_amount": float(exc.variance_amount or 0.0)},
        )

        await db.commit()
        return exc

    # -------------------------------------------------------------
    # 10. Audit Trail
    # -------------------------------------------------------------
    @staticmethod
    async def get_audit_trail(
        db: AsyncSession,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[FinanceAuditEventModel]:
        stmt = select(FinanceAuditEventModel).order_by(desc(FinanceAuditEventModel.timestamp))
        filters = []
        if entity_type:
            filters.append(FinanceAuditEventModel.entity_type == entity_type)
        if entity_id:
            filters.append(FinanceAuditEventModel.entity_id == entity_id)
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.limit(limit).offset(offset)
        res = await db.execute(stmt)
        return list(res.scalars().all())
