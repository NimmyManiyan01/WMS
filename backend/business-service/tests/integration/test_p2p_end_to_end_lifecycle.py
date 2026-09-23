"""
Comprehensive End-to-End P2P Lifecycle Integration Test.

Validates the full enterprise Procure-to-Pay pipeline with real PostgreSQL backend data:
1. Quotation
2. PO Proposal (Authoritative Calculations)
3. Finance Approval & Department Budget Check
4. PO Hold & Release Hold
5. PO Approval
6. ASN Dispatch & Email Notification
7. Goods Receipt Note (GRN)
8. Supplier Invoice Creation
9. 3-Way Matching (PO vs GRN vs Invoice variance adjudication)
10. Invoice Approval
11. Accounts Payable & Aging Schedule
12. Overpayment Prevention & Payment Disbursal
13. Payment Allocation & Outstanding to Paid Status Transition
14. Immutable Finance Audit Trail
"""

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.database.session import session_scope
from app.main import app
from app.modules.finance.infrastructure.persistence.models import (
    DepartmentBudgetModel,
)
from app.modules.procurement.infrastructure.persistence.models import (
    SupplierContactModel,
    SupplierModel,
)
from app.modules.receiving.infrastructure.persistence.models import GrnLineModel, GrnModel


@pytest.mark.asyncio
async def test_full_p2p_procure_to_pay_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock email dispatch to prevent external network SMTP latency
        with patch("app.common.email_utils.send_email", return_value=True), \
             patch("app.modules.procurement.infrastructure.api.router.send_email", return_value=True):

            # Finance and Procurement authorized headers
            headers = {
                "X-User-Id": "00000000-0000-0000-0000-000000000001",
                "X-User-Name": "cfo_finance_admin",
                "X-User-Roles": "ADMIN,FINANCE,PROCUREMENT_OFFICER,WAREHOUSE_MANAGER",
                "Authorization": "Bearer mock-jwt-finance-token",
            }

            # -------------------------------------------------------------
            # 0. Setup Department Budget for 2026-2027
            # -------------------------------------------------------------
            dept_name = "Operations"
            async with session_scope() as session:
                b_stmt = select(DepartmentBudgetModel).where(
                    DepartmentBudgetModel.department == dept_name,
                    DepartmentBudgetModel.financial_year == "2026-2027",
                )
                b_res = await session.execute(b_stmt)
                existing_budget = b_res.scalar_one_or_none()
                if not existing_budget:
                    new_budget = DepartmentBudgetModel(
                        id=uuid.uuid4(),
                        financial_year="2026-2027",
                        department=dept_name,
                        budget_category="OPEX",
                        allocated_amount=Decimal("5000000.0000"),
                        committed_amount=Decimal("100000.0000"),
                        consumed_amount=Decimal("50000.0000"),
                        currency="INR",
                        status="ACTIVE",
                    )
                    session.add(new_budget)
                    await session.commit()

            # -------------------------------------------------------------
            # 1. Setup Material & Supplier
            # -------------------------------------------------------------
            mat_suffix = uuid.uuid4().hex[:4].upper()
            mat_code = f"MAT-E2E-{mat_suffix}"
            mat_name = f"High Precision Servo Motor {mat_suffix}"
            mat_payload = {
                "material_code": mat_code,
                "material_name": mat_name,
                "category": "Electronics",
                "description": "Industrial grade brushless servo motor",
                "base_uom": "PCS",
                "status": "Active",
                "variants": [
                    {
                        "variant_code": f"{mat_code}-V01",
                        "size": "400W",
                        "color": "Black",
                        "grade": "Industrial",
                        "specification": "24V DC Brushless",
                        "uom": "PCS",
                        "status": "Active",
                    }
                ],
            }
            create_mat_res = await client.post("/api/v1/materials", json=mat_payload, headers=headers)
            assert create_mat_res.status_code == 201, f"Failed creating material: {create_mat_res.text}"
            mat_data = create_mat_res.json()
            mat_id = mat_data["id"]
            variant_id = mat_data["variants"][0]["id"]
            variant_code = mat_data["variants"][0]["variant_code"]

            # Create Supplier
            sup_id = uuid.uuid4()
            test_sup_email = f"accounts_{uuid.uuid4().hex[:4]}@servotech.com"
            async with session_scope() as session:
                sup = SupplierModel(
                    id=sup_id,
                    supplier_name=f"ServoTech Automation Ltd {mat_suffix}",
                    registered_company_name=f"ServoTech Automation Ltd {mat_suffix}",
                    vendor_type="MANUFACTURER",
                    category=["Electronics"],
                    industry="Automation",
                    gstin=f"29AABCS{uuid.uuid4().hex[:4].upper()}1Z8",
                    status="Active",
                )
                sup.contact = SupplierContactModel(
                    id=uuid.uuid4(),
                    supplier_id=sup_id,
                    primary_contact_name="Vikram Sengupta",
                    primary_email=test_sup_email,
                )
                session.add(sup)
                await session.commit()

            # -------------------------------------------------------------
            # 2. Material Request & RFQ
            # -------------------------------------------------------------
            mr_payload = {
                "warehouse_id": "WH-MAIN-01",
                "department": dept_name,
                "requested_by": "cfo_finance_admin",
                "required_date": str(date.today()),
                "remarks": "E2E P2P Servo Motors",
                "items": [
                    {
                        "material_id": mat_id,
                        "material_variant_id": variant_id,
                        "material_code": mat_code,
                        "variant_code": variant_code,
                        "material_name": mat_name,
                        "quantity": 20,
                        "uom": "PCS",
                    }
                ],
            }
            mr_res = await client.post("/api/v1/procurement/material-requests", json=mr_payload, headers=headers)
            assert mr_res.status_code in [200, 201], f"Failed MR: {mr_res.text}"
            mr_data = mr_res.json()
            mr_id = mr_data["id"]
            mr_number = mr_data["request_number"]

            # Approve MR
            app_mr_res = await client.post(f"/api/v1/procurement/material-requests/{mr_id}/process", headers=headers)
            assert app_mr_res.status_code == 200, f"Failed approving MR: {app_mr_res.text}"

            # Create RFQ
            rfq_payload = {
                "rfq_date": str(date.today()),
                "material_request_number": mr_number,
                "warehouse": "WH-MAIN-01",
                "procurement_officer": "cfo_finance_admin",
                "supplier_ids": [str(sup_id)],
                "items": [
                    {
                        "material_id": mat_id,
                        "material_variant_id": variant_id,
                        "material_code": mat_code,
                        "variant_code": variant_code,
                        "material_name": mat_name,
                        "category": "Electronics",
                        "quantity": 20,
                        "uom": "PCS",
                    }
                ],
            }
            rfq_res = await client.post("/api/v1/procurement/rfqs", json=rfq_payload, headers=headers)
            assert rfq_res.status_code in [200, 201], f"Failed RFQ: {rfq_res.text}"
            rfq_id = rfq_res.json()["id"]

            # -------------------------------------------------------------
            # 3. Submit Quotation
            # -------------------------------------------------------------
            # Unit Price: 5000.00, Qty: 20 -> Subtotal: 100,000.00
            # Discount: 5% (5,000.00) -> Taxable: 95,000.00
            # Tax: 18% (17,100.00) -> Grand Total: 112,100.00
            quote_payload = {
                "rfq_id": rfq_id,
                "supplier_id": str(sup_id),
                "lines": [
                    {
                        "material_id": mat_id,
                        "material_variant_id": variant_id,
                        "item_code": variant_code,
                        "variant_code": variant_code,
                        "quantity": 20,
                        "unit_price": 5000.00,
                    }
                ],
                "tax": 18.0,
                "discount": 5.0,
            }
            quote_res = await client.post("/api/v1/procurement/quotations", json=quote_payload, headers=headers)
            assert quote_res.status_code == 201, f"Failed Quote: {quote_res.text}"

            # -------------------------------------------------------------
            # 4. Generate Purchase Order Proposal
            # -------------------------------------------------------------
            sel_payload = {
                "supplier_id": str(sup_id),
                "selection_reason": "Technical Compliance & Best Commercial Terms",
                "selection_comments": "Authoritative P2P lifecycle proposal",
            }
            sel_res = await client.post(f"/api/v1/procurement/rfqs/{rfq_id}/select-supplier", json=sel_payload, headers=headers)
            assert sel_res.status_code == 200, f"Failed Select: {sel_res.text}"
            po_id = sel_res.json()["po_id"]

            # Fetch PO and verify status is PENDING_FINANCE or PENDING_FINANCE_APPROVAL
            po_res = await client.get(f"/api/v1/procurement/purchase-orders/{po_id}", headers=headers)
            assert po_res.status_code == 200, f"Failed PO fetch: {po_res.text}"
            po_data = po_res.json()
            po_number = po_data.get("po_number") or po_data.get("poNumber")
            items = po_data.get("items", [])
            po_item_id = items[0].get("id") if items else None

            # -------------------------------------------------------------
            # 5. Finance Approval Enhancements: Budget Check
            # -------------------------------------------------------------
            budget_res = await client.get(f"/api/v1/finance/budget-check/{po_id}", headers=headers)
            assert budget_res.status_code == 200, f"Failed budget check: {budget_res.text}"
            budget_data = budget_res.json()
            assert budget_data["status"] in ["SUFFICIENT", "WARNING", "EXCEEDED", "APPROVED", "WITHIN_BUDGET"]
            assert budget_data["allocated_amount"] >= 0

            # -------------------------------------------------------------
            # 6. Finance Approval Enhancements: Put On Hold & Release Hold
            # -------------------------------------------------------------
            hold_payload = {
                "hold_reason": "Verifying project timeline before releasing advance",
                "hold_comment": "CFO requested secondary check with engineering head",
            }
            hold_res = await client.post(f"/api/v1/finance/purchase-orders/{po_id}/hold", json=hold_payload, headers=headers)
            assert hold_res.status_code == 200, f"Failed hold: {hold_res.text}"
            assert hold_res.json()["status"] in ["ON_HOLD", "FINANCE_HOLD"]

            # Check PO status is ON_HOLD / FINANCE_HOLD and history recorded FINANCE_HOLD
            po_hold_res = await client.get(f"/api/v1/procurement/purchase-orders/{po_id}", headers=headers)
            po_hold_data = po_hold_res.json()
            assert po_hold_data["status"] in ["ON_HOLD", "FINANCE_HOLD"]
            assert any(h.get("status") == "FINANCE_HOLD" for h in po_hold_data.get("history", []))

            # Release Hold
            release_res = await client.post(
                f"/api/v1/finance/purchase-orders/{po_id}/release-hold",
                json={"notes": "Engineering head confirmed schedule. Released."},
                headers=headers,
            )
            assert release_res.status_code == 200, f"Failed release hold: {release_res.text}"
            assert release_res.json()["status"] in ["PENDING_FINANCE", "PENDING_FINANCE_APPROVAL"]

            # -------------------------------------------------------------
            # 7. PO Approval
            # -------------------------------------------------------------
            approve_po_res = await client.post(f"/api/v1/procurement/purchase-orders/{po_id}/approve", headers=headers)
            assert approve_po_res.status_code == 200, f"Failed PO approve: {approve_po_res.text}"
            assert approve_po_res.json()["status"] == "success"
            po_number = approve_po_res.json().get("po_number") or po_number

            # Verify PO in DB has status APPROVED
            po_approved_res = await client.get(f"/api/v1/procurement/purchase-orders/{po_id}", headers=headers)
            assert po_approved_res.status_code == 200
            assert po_approved_res.json()["status"] == "APPROVED"

            # -------------------------------------------------------------
            # 8. ASN / Gate Entry & GRN
            # -------------------------------------------------------------
            asn_number = f"ASN-E2E-{uuid.uuid4().hex[:6].upper()}"
            asn_payload = {
                "po_id": str(po_id),
                "po_number": po_number,
                "asn_number": asn_number,
                "shipment_date": str(date.today()),
                "expected_arrival_at": datetime.utcnow().isoformat() + "Z",
                "vehicle_number": "KA-04-E2E-7788",
                "driver_name": "Rohan Deshmukh",
                "driver_contact": "+91 9123456780",
                "transporter": "Apex Logistics Express",
                "number_of_packages": 4,
                "package_type": "Box",
                "status": "SUBMITTED",
                "lines": [
                    {
                        "item_code": variant_code,
                        "material_name": mat_name,
                        "shipped_quantity": 20.0,
                        "uom": "PCS",
                    }
                ],
                "documents": [],
            }

            asn_res = await client.post("/api/v1/procurement/asns", json=asn_payload, headers=headers)
            assert asn_res.status_code == 201, f"Failed ASN: {asn_res.text}"
            asn_id = asn_res.json()["id"]

            # Create GRN directly in database to simulate warehouse receiving
            grn_id = uuid.uuid4()
            grn_number = f"GRN-E2E-{uuid.uuid4().hex[:6].upper()}"
            grn_line_id = uuid.uuid4()
            async with session_scope() as session:
                grn = GrnModel(
                    id=grn_id,
                    grn_number=grn_number,
                    po_id=uuid.UUID(po_id),
                    po_number=po_number,
                    asn_id=uuid.UUID(asn_id),
                    asn_number=asn_number,
                    supplier_name=f"ServoTech Automation Ltd {mat_suffix}",
                    warehouse_id="WH-MAIN-01",
                    warehouse_name="Main Central Warehouse",
                    dock_number="DOCK-01",
                    vehicle_number="KA-04-E2E-7788",
                    driver_name="Rohan Deshmukh",
                    receipt_type="PO_RECEIPT",
                    receipt_date=datetime.utcnow(),
                    status="COMPLETED",
                )
                grn_line = GrnLineModel(
                    id=grn_line_id,
                    grn_id=grn_id,
                    item_code=variant_code,
                    material_name=mat_name,
                    uom="PCS",
                    ordered_quantity=Decimal("20.0000"),
                    received_quantity=Decimal("20.0000"),
                    good_quantity=Decimal("20.0000"),
                    damaged_quantity=Decimal("0.0000"),
                    accepted_quantity=Decimal("20.0000"),
                )
                session.add(grn)
                session.add(grn_line)
                await session.commit()

            # -------------------------------------------------------------
            # 9. Supplier Invoice Creation (Real Backend Data)
            # -------------------------------------------------------------
            inv_number = f"INV-E2E-{uuid.uuid4().hex[:6].upper()}"
            invoice_payload = {
                "invoice_number": inv_number,
                "supplier_id": str(sup_id),
                "po_id": str(po_id),
                "grn_id": str(grn_id),
                "invoice_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=30)),
                "currency": "INR",
                "payment_terms": "Net 30",
                "subtotal": 100000.00,
                "discount_amount": 5000.00,
                "tax_amount": 17100.00,
                "freight_charges": 0.00,
                "other_charges": 0.00,
                "notes": "E2E P2P Servo Motors official invoice",
                "items": [
                    {
                        "material_id": str(mat_id),
                        "material_code": variant_code,
                        "material_name": mat_name,
                        "quantity": 20.0,
                        "uom": "PCS",
                        "unit_price": 5000.00,
                        "discount": 5000.00,
                        "tax": 17100.00,
                        "po_item_id": str(po_item_id) if po_item_id else None,
                        "grn_line_id": str(grn_line_id) if grn_line_id else None,
                    }
                ],
            }
            create_inv_res = await client.post("/api/v1/finance/invoices", json=invoice_payload, headers=headers)
            assert create_inv_res.status_code == 201, f"Failed create invoice: {create_inv_res.text}"
            inv_data = create_inv_res.json()
            invoice_id = inv_data["id"]
            assert inv_data["status"] in ["RECEIVED", "READY_FOR_APPROVAL", "UNDER_REVIEW"]
            assert inv_data["match_status"] in ["PENDING", "MATCHED"]
            assert inv_data["grand_total"] == 112100.00
            assert inv_data["outstanding_amount"] == 112100.00
            assert inv_data["paid_amount"] == 0.00

            # -------------------------------------------------------------
            # 10. 3-Way Matching (PO vs GRN vs Invoice)
            # -------------------------------------------------------------
            match_res = await client.post(f"/api/v1/finance/invoices/{invoice_id}/match", headers=headers)
            assert match_res.status_code == 200, f"Failed match: {match_res.text}"
            match_data = match_res.json()
            assert match_data["match_status"] == "MATCHED"
            assert match_data["quantity_variance"] == 0.0
            assert match_data["price_variance"] == 0.0
            assert match_data["total_variance"] == 0.0

            # Verify Invoice status reflects MATCHED
            get_inv_res = await client.get(f"/api/v1/finance/invoices/{invoice_id}", headers=headers)
            assert get_inv_res.json()["match_status"] == "MATCHED"

            # -------------------------------------------------------------
            # 11. Invoice Validation & Approval
            # -------------------------------------------------------------
            app_inv_res = await client.post(
                f"/api/v1/finance/invoices/{invoice_id}/approve",
                json={"approved": True, "notes": "3-Way Match verified and approved for payment"},
                headers=headers,
            )
            assert app_inv_res.status_code == 200, f"Failed invoice approval: {app_inv_res.text}"
            assert app_inv_res.json()["status"] == "APPROVED"

            # -------------------------------------------------------------
            # 12. Accounts Payable & Aging Schedule
            # -------------------------------------------------------------
            aging_res = await client.get("/api/v1/finance/payables/aging", headers=headers)
            assert aging_res.status_code == 200, f"Failed AP aging: {aging_res.text}"
            aging_data = aging_res.json()
            assert (aging_data.get("total_outstanding") or aging_data.get("total_payable") or 0.0) >= 112100.00
            assert "buckets" in aging_data

            # -------------------------------------------------------------
            # 13. Overpayment Prevention
            # -------------------------------------------------------------
            overpay_payload = {
                "supplier_id": str(sup_id),
                "payment_date": str(date.today()),
                "amount": 200000.00,
                "currency": "INR",
                "payment_method": "NEFT",
                "allocations": [
                    {
                        "invoice_id": str(invoice_id),
                        "allocated_amount": 150000.00,  # Greater than outstanding (112,100.00)
                        "notes": "Attempted overpayment",
                    }
                ],
            }
            overpay_res = await client.post("/api/v1/finance/payments", json=overpay_payload, headers=headers)
            assert overpay_res.status_code == 400, f"Expected 400 for overpayment: {overpay_res.text}"
            assert "exceeds invoice outstanding amount" in overpay_res.json()["detail"]

            # -------------------------------------------------------------
            # 14. Payment Creation & Allocation (Full Payment)
            # -------------------------------------------------------------
            payment_ref = f"PAY-E2E-{uuid.uuid4().hex[:6].upper()}"
            valid_payment_payload = {
                "supplier_id": str(sup_id),
                "payment_reference": payment_ref,
                "payment_date": str(date.today()),
                "amount": 112100.00,
                "currency": "INR",
                "payment_method": "NEFT",
                "transaction_reference": f"TXN-{uuid.uuid4().hex[:8].upper()}",
                "bank_name": "State Bank of India",
                "bank_reference": f"SBI-{uuid.uuid4().hex[:6].upper()}",
                "notes": "Full settlement for Servo Motors",
                "allocations": [
                    {
                        "invoice_id": str(invoice_id),
                        "allocated_amount": 112100.00,
                        "notes": "Full allocation",
                    }
                ],
            }
            pay_res = await client.post("/api/v1/finance/payments", json=valid_payment_payload, headers=headers)
            assert pay_res.status_code == 201, f"Failed payment: {pay_res.text}"
            pay_data = pay_res.json()
            assert pay_data["amount"] == 112100.00
            assert pay_data["allocated_amount"] == 112100.00
            assert pay_data["unallocated_amount"] == 0.00

            # -------------------------------------------------------------
            # 15. Verify Outstanding Decrement & Paid Transition
            # -------------------------------------------------------------
            final_inv_res = await client.get(f"/api/v1/finance/invoices/{invoice_id}", headers=headers)
            assert final_inv_res.status_code == 200
            final_inv = final_inv_res.json()
            assert final_inv["paid_amount"] == 112100.00
            assert final_inv["outstanding_amount"] == 0.00
            assert final_inv["status"] == "PAID"

            # -------------------------------------------------------------
            # 16. Supplier Statement Verification
            # -------------------------------------------------------------
            statement_res = await client.get(f"/api/v1/finance/supplier-statement/{sup_id}", headers=headers)
            assert statement_res.status_code == 200
            statement = statement_res.json()
            assert statement["total_invoiced"] == 112100.00
            assert statement["total_paid"] == 112100.00
            assert (statement.get("closing_balance") if statement.get("closing_balance") is not None else statement.get("total_outstanding", 0.0)) == 0.00
            assert len(statement.get("entries", [])) >= 2

            # -------------------------------------------------------------
            # 17. Immutable Finance Audit Trail Verification
            # -------------------------------------------------------------
            audit_res = await client.get("/api/v1/finance/reports/audit-trail", headers=headers)
            assert audit_res.status_code == 200
            audit_entries = audit_res.json()
            actions = [entry["action"] for entry in audit_entries]
            assert "PO_HOLD" in actions
            assert "PO_HOLD_RELEASED" in actions
            assert "INVOICE_CREATED" in actions
            assert "THREE_WAY_MATCH_RUN" in actions
            assert "INVOICE_APPROVED" in actions
            assert "PAYMENT_CREATED" in actions

            print("\n\n>>> SUCCESS: Complete P2P End-to-End lifecycle verified from Quotation to Paid & Audit Trail! <<<\n")
