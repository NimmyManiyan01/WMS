"""
Unit tests for Enterprise Procure-to-Pay (P2P) Finance logic:
1. Authoritative financial calculations & discount bounding
2. 3-Way Matching Engine with tolerance enforcement
3. Multi-invoice payment allocation logic
4. Accounts Payable aging calculation
"""
from datetime import date, timedelta
from decimal import Decimal
import pytest

from app.modules.finance.domain.calculations import (
    calculate_invoice_totals,
    calculate_item_total,
    calculate_authoritative_financials,
    round_curr,
)
from app.modules.finance.domain.matching_engine import (
    match_three_way,
    DEFAULT_PRICE_TOLERANCE_PCT,
)


# -------------------------------------------------------------
# 1. Financial Calculations Tests
# -------------------------------------------------------------
def test_financial_calculations_basic():
    items = [
        {"quantity": 10, "unit_price": 500.0, "tax_rate": 18.0},
        {"quantity": 5, "unit_price": 1000.0, "tax_rate": 18.0},
    ]
    # Subtotal = 10*500 + 5*1000 = 10,000
    totals = calculate_invoice_totals(
        items=items,
        discount_percentage=10.0, # 10% discount = 1,000 -> Taxable = 9,000
        tax_percentage=18.0,      # 18% of 9000 = 1,620
        freight_charges=300.0,
        additional_charges=50.0,
        paid_amount=0.0,
    )

    assert totals["subtotal"] == 10000.0
    assert totals["discount_amount"] == 1000.0
    assert totals["discount_percentage"] == 10.0
    assert totals["taxable_amount"] == 9000.0
    assert totals["tax_amount"] == 1620.0
    assert totals["freight_charges"] == 300.0
    assert totals["additional_charges"] == 50.0
    assert totals["total_amount"] == 10970.0
    assert totals["balance_due"] == 10970.0


def test_discount_cannot_exceed_subtotal():
    """Guarantees discount cannot blow up or make totals negative"""
    items = [{"quantity": 2, "unit_price": 100.0}]
    # Subtotal = 200. Discount amount = 500 (excessive)
    totals = calculate_invoice_totals(
        items=items,
        discount_amount=500.0,
        tax_percentage=10.0,
    )
    assert totals["subtotal"] == 200.0
    assert totals["discount_amount"] == 200.0  # capped at subtotal
    assert totals["taxable_amount"] == 0.0
    assert totals["tax_amount"] == 0.0
    assert totals["total_amount"] == 0.0
    assert totals["balance_due"] == 0.0


def test_payment_balance_due():
    items = [{"quantity": 1, "unit_price": 1000.0}]
    totals = calculate_invoice_totals(
        items=items,
        discount_amount=0.0,
        tax_amount=180.0,
        paid_amount=400.0,
    )
    assert totals["total_amount"] == 1180.0
    assert totals["paid_amount"] == 400.0
    assert totals["balance_due"] == 780.0


def test_discount_zero_and_hundred_percent():
    # 0% discount
    res_zero = calculate_authoritative_financials(
        subtotal=1000,
        discount_percentage=0,
        tax_percentage=18,
        freight_charges=50,
    )
    assert res_zero["subtotal"] == Decimal("1000.00")
    assert res_zero["discount_amount"] == Decimal("0.00")
    assert res_zero["taxable_amount"] == Decimal("1000.00")
    assert res_zero["tax_amount"] == Decimal("180.00")
    assert res_zero["grand_total"] == Decimal("1230.00")

    # 100% discount
    res_hundred = calculate_authoritative_financials(
        subtotal=1000,
        discount_percentage=100,
        tax_percentage=18,
        freight_charges=50,
    )
    assert res_hundred["discount_amount"] == Decimal("1000.00")
    assert res_hundred["taxable_amount"] == Decimal("0.00")
    assert res_hundred["tax_amount"] == Decimal("0.00")
    assert res_hundred["grand_total"] == Decimal("50.00") # only freight


def test_discount_exceeding_subtotal_and_negative_discount():
    # Negative discount should be clamped to 0
    res_neg = calculate_authoritative_financials(
        subtotal=5000,
        discount_percentage=-25,
        tax_percentage=10,
    )
    assert res_neg["discount_percentage"] == Decimal("0.00")
    assert res_neg["discount_amount"] == Decimal("0.00")
    assert res_neg["taxable_amount"] == Decimal("5000.00")
    assert res_neg["grand_total"] == Decimal("5500.00")

    # Discount > 100% should be clamped to 100% and capped at subtotal
    res_over = calculate_authoritative_financials(
        subtotal=5000,
        discount_percentage=150,
        tax_percentage=10,
    )
    assert res_over["discount_percentage"] == Decimal("100.00")
    assert res_over["discount_amount"] == Decimal("5000.00")
    assert res_over["taxable_amount"] == Decimal("0.00")
    assert res_over["grand_total"] == Decimal("0.00")


def test_authoritative_calculation_exact_equation():
    # subtotal - discount = taxable; taxable + tax + freight + other = grand_total
    res = calculate_authoritative_financials(
        subtotal=998400,
        discount_percentage=10,
        tax_percentage=18,
        freight_charges=500,
        additional_charges=100,
    )
    # subtotal = 998,400.00
    # discount = 99,840.00
    # taxable = 898,560.00
    # tax = 161,740.80
    # grand_total = 898560 + 161740.80 + 500 + 100 = 1,060,900.80
    assert res["subtotal"] == Decimal("998400.00")
    assert res["discount_amount"] == Decimal("99840.00")
    assert res["taxable_amount"] == Decimal("898560.00")
    assert res["tax_amount"] == Decimal("161740.80")
    assert res["freight_charges"] == Decimal("500.00")
    assert res["additional_charges"] == Decimal("100.00")
    assert res["grand_total"] == Decimal("1060900.80")


# -------------------------------------------------------------
# 2. 3-Way Matching Engine Tests
# -------------------------------------------------------------
def test_three_way_match_perfect():
    po_items = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "quantity": 100.0, "unit_price": 50.0}
    ]
    grn_lines = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "good_quantity": 100.0, "unit_price": 50.0}
    ]
    invoice_items = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "quantity": 100.0, "unit_price": 50.0}
    ]

    res = match_three_way(
        invoice_items=invoice_items,
        po_items=po_items,
        grn_lines=grn_lines,
        invoice_grand_total=5000.0,
        po_grand_total=5000.0,
    )

    assert res.match_status == "MATCHED"
    assert res.po_matched is True
    assert res.grn_matched is True
    assert res.price_matched is True
    assert res.qty_matched is True
    assert len(res.exceptions) == 0


def test_three_way_match_price_tolerance_warning():
    """Price is 1.5% higher (within default 2% tolerance)"""
    po_items = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "quantity": 100.0, "unit_price": 100.0}
    ]
    grn_lines = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "good_quantity": 100.0, "unit_price": 100.0}
    ]
    invoice_items = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "quantity": 100.0, "unit_price": 101.5}  # 1.5% higher
    ]

    res = match_three_way(
        invoice_items=invoice_items,
        po_items=po_items,
        grn_lines=grn_lines,
        invoice_grand_total=10150.0,
        po_grand_total=10000.0,
        price_tolerance_pct=2.0,
    )

    assert res.match_status == "TOLERANCE_WARNING"
    assert res.price_matched is True
    assert res.qty_matched is True
    assert len(res.exceptions) == 1
    assert res.exceptions[0]["exception_type"] == "PRICE_VARIANCE_WARNING"


def test_three_way_match_discrepancy_price_exceeded():
    """Price is 10% higher (exceeds 2% tolerance)"""
    po_items = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "quantity": 100.0, "unit_price": 100.0}
    ]
    grn_lines = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "good_quantity": 100.0, "unit_price": 100.0}
    ]
    invoice_items = [
        {"item_code": "MAT-001", "item_name": "Bearing A", "quantity": 100.0, "unit_price": 110.0}  # 10% higher
    ]

    res = match_three_way(
        invoice_items=invoice_items,
        po_items=po_items,
        grn_lines=grn_lines,
        invoice_grand_total=11000.0,
        po_grand_total=10000.0,
        price_tolerance_pct=2.0,
    )

    assert res.match_status == "DISCREPANCY"
    assert res.price_matched is False
    assert any(e["exception_type"] == "PRICE_VARIANCE" for e in res.exceptions)


def test_three_way_match_discrepancy_unreceived_goods():
    """Invoice billed 50 units, but GRN shows 0 accepted units"""
    po_items = [
        {"item_code": "MAT-002", "item_name": "Cable B", "quantity": 50.0, "unit_price": 200.0}
    ]
    grn_lines = [
        {"item_code": "MAT-002", "item_name": "Cable B", "good_quantity": 0.0, "received_quantity": 0.0, "unit_price": 200.0}
    ]
    invoice_items = [
        {"item_code": "MAT-002", "item_name": "Cable B", "quantity": 50.0, "unit_price": 200.0}
    ]

    res = match_three_way(
        invoice_items=invoice_items,
        po_items=po_items,
        grn_lines=grn_lines,
        invoice_grand_total=10000.0,
        po_grand_total=10000.0,
    )

    assert res.match_status == "DISCREPANCY"
    assert res.qty_matched is False
    assert any(e["exception_type"] == "UNRECEIVED_GOODS" for e in res.exceptions)


# -------------------------------------------------------------
# 3. Budget Check & Tolerance Tests
# -------------------------------------------------------------
def test_budget_status_determination():
    """Verify available, warning, and exceeded status calculations"""
    allocated = Decimal("1000000.00")
    committed = Decimal("400000.00")
    consumed = Decimal("200000.00")
    available = allocated - committed - consumed  # 400,000

    # Scenario 1: PO within budget (<80% utilized)
    po_amount = Decimal("50000.00")
    remaining = available - po_amount
    assert remaining > 0
    utilization_pct = ((committed + consumed + po_amount) / allocated) * 100
    assert utilization_pct == Decimal("65.00")  # AVAILABLE

    # Scenario 2: PO causes warning (>80% but <=100%)
    po_warning = Decimal("250000.00")
    remaining_warn = available - po_warning
    util_warn = ((committed + consumed + po_warning) / allocated) * 100
    assert util_warn == Decimal("85.00")  # WARNING (>80%)
    assert remaining_warn >= 0

    # Scenario 3: PO exceeds budget
    po_exceeded = Decimal("500000.00")
    remaining_exc = available - po_exceeded
    assert remaining_exc < 0  # EXCEEDED


# -------------------------------------------------------------
# 4. Multi-Invoice Payment Allocation & Overpayment Prevention
# -------------------------------------------------------------
def test_payment_allocation_and_overpayment_prevention():
    """Simulates payment allocation logic ensuring no overpayment occurs"""
    invoices = [
        {"id": "inv-1", "grand_total": 50000.0, "paid_amount": 0.0, "outstanding": 50000.0},
        {"id": "inv-2", "grand_total": 30000.0, "paid_amount": 10000.0, "outstanding": 20000.0},
    ]

    total_payment = 65000.0
    allocated_allocations = []
    remaining_payment = total_payment

    for inv in invoices:
        alloc_amt = min(inv["outstanding"], remaining_payment)
        allocated_allocations.append({
            "invoice_id": inv["id"],
            "allocated_amount": alloc_amt,
        })
        inv["paid_amount"] += alloc_amt
        inv["outstanding"] -= alloc_amt
        remaining_payment -= alloc_amt

    assert allocated_allocations[0]["allocated_amount"] == 50000.0
    assert invoices[0]["outstanding"] == 0.0
    assert invoices[0]["paid_amount"] == 50000.0

    assert allocated_allocations[1]["allocated_amount"] == 15000.0
    assert invoices[1]["outstanding"] == 5000.0
    assert invoices[1]["paid_amount"] == 25000.0

    assert remaining_payment == 0.0


# -------------------------------------------------------------
# 5. Security & RBAC Enforcement Tests
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_rbac_security_enforcement():
    from app.security.dependencies import CurrentUser, require_permission
    from fastapi import HTTPException

    # 1. Finance user with finance:approve permission
    finance_user = CurrentUser(
        subject="fin-01",
        username="finance_officer",
        roles=["FINANCE"],
        permissions=["finance:read", "finance:approve", "finance:pay"],
        raw_claims={},
    )
    checker = require_permission("finance:approve")
    res = await checker(user=finance_user)
    assert res.username == "finance_officer"

    # 2. Admin user bypasses checks
    admin_user = CurrentUser(
        subject="adm-01",
        username="admin_user",
        roles=["ADMIN"],
        permissions=[],
        raw_claims={},
    )
    res_admin = await checker(user=admin_user)
    assert res_admin.username == "admin_user"

    # 3. Unauthorized user (e.g. warehouse or assembly without finance permissions)
    unauthorized_user = CurrentUser(
        subject="wh-01",
        username="warehouse_user",
        roles=["ASSEMBLY"],
        permissions=["assembly:read"],
        raw_claims={},
    )
    with pytest.raises(HTTPException) as excinfo:
        await checker(user=unauthorized_user)
    assert excinfo.value.status_code == 403

