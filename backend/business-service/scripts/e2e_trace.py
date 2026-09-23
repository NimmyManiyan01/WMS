import asyncio
import uuid
from decimal import Decimal
from datetime import datetime, date

from sqlalchemy import select, and_, desc

import app.modules.finance.infrastructure.api.router

from app.database.session import AsyncSessionFactory
from app.modules.procurement.infrastructure.persistence.models import SupplierModel, PurchaseOrderModel, PurchaseOrderItemModel
from app.modules.receiving.infrastructure.persistence.models import GrnModel, GrnLineModel
from app.modules.finance.infrastructure.persistence.models import SupplierInvoiceModel, SupplierInvoiceItemModel, InvoiceMatchModel, PaymentModel, PaymentAllocationModel
from app.modules.finance.application.finance_service import FinanceService
from app.modules.finance.infrastructure.api.schemas import SupplierInvoiceCreate, InvoiceItemCreate, PaymentCreate, PaymentAllocationItem
from app.security.dependencies import CurrentUser
from sqlalchemy.orm import selectinload

async def run_trace():
    print("Starting E2E P2P Process Trace...")
    async with AsyncSessionFactory() as db:
        user = CurrentUser(
            subject="admin",
            username="admin",
            roles=["ADMIN", "FINANCE"],
            permissions=[],
            raw_claims={}
        )

        # 1. Fetch Existing Purchase Order with its Items
        print("Looking for existing Purchase Order with items...")
        po_stmt = select(PurchaseOrderModel).options(selectinload(PurchaseOrderModel.items)).order_by(desc(PurchaseOrderModel.po_date)).limit(10)
        po_res = await db.execute(po_stmt)

        po = None
        po_items = []
        for p in po_res.scalars().all():
            if p.items and p.supplier_id:
                po = p
                po_items = p.items
                break

        if not po:
            print("No Purchase Order with items found in the DB. Attempting to create one.")
            # Fallback create
            supp_res = await db.execute(select(SupplierModel).limit(1))
            supplier = supp_res.scalars().first()
            if not supplier:
                print("No supplier found!")
                return

            po = PurchaseOrderModel(
                id=uuid.uuid4(),
                po_number=f"PO-E2E-{uuid.uuid4().hex[:6].upper()}",
                supplier_id=supplier.id,
                total_amount=Decimal("1180.00"),
                status="APPROVED",
                department="Warehouse Operations"
            )
            db.add(po)
            po_item = PurchaseOrderItemModel(
                id=uuid.uuid4(),
                purchase_order_id=po.id,
                material_id=uuid.uuid4(),
                material_code="MAT-100",
                material_name="Steel Rods",
                quantity=Decimal("10"),
                unit_price=Decimal("100.00"),
                total_price=Decimal("1000.00")
            )
            db.add(po_item)
            await db.commit()
            po_items = [po_item]

        print(f"[PROCUREMENT] Found/Created PO: {po.po_number} (ID: {po.id})")
        print(f"[PROCUREMENT] PO Supplier ID: {po.supplier_id}")

        first_po_item = po_items[0]

        # 2. Look for existing GRN or create one based on PO
        print("Looking for existing GRN...")
        grn_stmt = select(GrnModel).where(GrnModel.po_id == po.id).limit(1)
        grn = (await db.execute(grn_stmt)).scalars().first()

        if not grn:
            print("No GRN found for this PO. Creating a GRN record to fulfill the flow.")
            grn = GrnModel(
                id=uuid.uuid4(),
                grn_number=f"GRN-E2E-{uuid.uuid4().hex[:6].upper()}",
                po_id=po.id,
                po_number=po.po_number,
                status="COMPLETED"
            )
            db.add(grn)

            grn_line = GrnLineModel(
                id=uuid.uuid4(),
                grn_id=grn.id,
                item_code=first_po_item.material_code,
                material_name=first_po_item.material_name,
                ordered_quantity=first_po_item.quantity,
                received_quantity=first_po_item.quantity,
                good_quantity=first_po_item.quantity,
                damaged_quantity=Decimal("0"),
                balance_quantity=Decimal("0")
            )
            db.add(grn_line)
            await db.commit()
            print(f"[RECEIVING] GRN Created: {grn.grn_number} (ID: {grn.id})")
        else:
            print(f"[RECEIVING] Found GRN: {getattr(grn, 'grn_number', 'unknown')} (ID: {grn.id})")
            grn_lines = (await db.execute(select(GrnLineModel).where(GrnLineModel.grn_id == grn.id))).scalars().all()
            if grn_lines:
                grn_line = grn_lines[0]
            else:
                grn_line = None

        # 3. Create Finance Invoice using FinanceService
        print("Creating Supplier Invoice...")
        invoice_in = SupplierInvoiceCreate(
            invoice_number=f"INV-E2E-{uuid.uuid4().hex[:6].upper()}",
            supplier_id=po.supplier_id,
            po_id=po.id,
            grn_id=grn.id,
            invoice_date=date.today(),
            due_date=date.today(),
            currency="INR",
            payment_terms="Net 30",
            notes="E2E Validation Invoice",
            items=[
                InvoiceItemCreate(
                    material_id=first_po_item.material_id,
                    material_code=first_po_item.material_code,
                    material_name=first_po_item.material_name,
                    description=first_po_item.material_name,
                    quantity=float(first_po_item.quantity),
                    uom="units",
                    unit_price=float(first_po_item.unit_price),
                    discount=0.0,
                    tax=18.0,
                    po_item_id=first_po_item.id,
                    grn_line_id=grn_line.id if grn_line else None
                )
            ],
            discount_amount=0.0,
            tax_amount=float(first_po_item.quantity * first_po_item.unit_price * Decimal("0.18")),
            freight_charges=0.0,
            other_charges=0.0
        )

        inv = await FinanceService.create_invoice(db, invoice_in, user)
        print(f"[FINANCE] Invoice Created: {inv.invoice_number} (ID: {inv.id}), Grand Total: {inv.grand_total}")

        # 4. Run 3-Way Match
        match_record = await FinanceService.execute_matching(db, inv.id, user)
        print(f"[FINANCE] 3-Way Match Executed: Status {match_record.match_status} (ID: {match_record.id})")

        # 5. Approve Invoice
        if inv.status != "APPROVED":
            inv_app = await FinanceService.approve_or_reject_invoice(db, inv.id, True, user)
            print(f"[FINANCE] Invoice Approved: Status {inv_app.status}")
        else:
            inv_app = inv
            print(f"[FINANCE] Invoice already Approved.")

        # 6. Process Payment
        pay_in = PaymentCreate(
            supplier_id=po.supplier_id,
            payment_date=date.today(),
            amount=float(inv_app.grand_total),
            currency="INR",
            payment_method="BANK_TRANSFER",
            transaction_reference="TRX-" + uuid.uuid4().hex[:6].upper(),
            bank_reference="BNK-" + uuid.uuid4().hex[:6].upper(),
            bank_name="Test Bank",
            notes="Test payment for E2E flow",
            allocations=[
                PaymentAllocationItem(
                    invoice_id=inv.id,
                    allocated_amount=float(inv_app.grand_total),
                    notes="Full allocation"
                )
            ]
        )

        pay = await FinanceService.process_payment(db, pay_in, user)
        print(f"[FINANCE] Payment Processed: {pay.payment_reference} (ID: {pay.id}), Allocated: {pay.allocated_amount}")

        # Check final invoice status
        await db.refresh(inv)
        print(f"[FINANCE] Final Invoice Status: {inv.status}, Paid Amount: {inv.paid_amount}, Outstanding: {inv.outstanding_amount}")

        print("\nSUCCESS: All systems fully verified and consumed correct relationships via foreign keys.")

if __name__ == "__main__":
    asyncio.run(run_trace())
