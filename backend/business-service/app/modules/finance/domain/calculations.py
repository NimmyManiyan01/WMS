"""
Authoritative financial math and calculation rules for Procure-to-Pay (P2P).
Guarantees Decimal precision, consistent rounding, strict discount bounding (0-100%, <= subtotal),
non-negative taxes, freight, additional charges, and grand total.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple, Union

TWO_PLACES = Decimal("0.01")
ZERO = Decimal("0.00")
HUNDRED = Decimal("100.00")


def to_decimal(value: Union[float, Decimal, int, str, None], default: str = "0.00") -> Decimal:
    if value is None:
        return Decimal(default)
    try:
        val_str = str(value).strip()
        if not val_str:
            return Decimal(default)
        return Decimal(val_str).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)


def round_curr(value: Union[float, Decimal, int, str, None]) -> float:
    return float(to_decimal(value))


def calculate_item_total(quantity: float, unit_price: float, tax_rate: float = 0.0) -> Dict[str, float]:
    qty = max(Decimal("0.0"), to_decimal(quantity))
    price = max(Decimal("0.0"), to_decimal(unit_price))
    tax_pct = max(Decimal("0.0"), min(HUNDRED, to_decimal(tax_rate)))
    
    line_subtotal = (qty * price).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    line_tax = (line_subtotal * (tax_pct / Decimal("100"))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    line_total = line_subtotal + line_tax
    
    return {
        "quantity": float(qty),
        "unit_price": float(price),
        "tax_rate": float(tax_pct),
        "line_subtotal": float(line_subtotal),
        "line_tax": float(line_tax),
        "line_total": float(line_total),
    }


def calculate_authoritative_financials(
    subtotal: Union[Decimal, float, int, str],
    discount_amount: Optional[Union[Decimal, float, int, str]] = None,
    discount_percentage: Optional[Union[Decimal, float, int, str]] = None,
    tax_amount: Optional[Union[Decimal, float, int, str]] = None,
    tax_percentage: Optional[Union[Decimal, float, int, str]] = None,
    freight_charges: Union[Decimal, float, int, str] = "0.00",
    additional_charges: Union[Decimal, float, int, str] = "0.00",
    paid_amount: Union[Decimal, float, int, str] = "0.00",
) -> Dict[str, Decimal]:
    """
    Authoritative single-source calculation adhering to the enterprise equation:
        subtotal
      - discount_amount
      = taxable_amount

        taxable_amount
      + tax_amount
      + freight_charges
      + additional_charges
      = grand_total

    Validation & Constraints:
      * subtotal >= 0
      * discount percentage 0 <= pct <= 100
      * discount amount 0 <= amt <= subtotal
      * taxable amount >= 0
      * tax percentage >= 0, tax amount >= 0
      * freight charges >= 0
      * additional charges >= 0
      * grand total >= 0
      * balance due = max(0, grand_total - paid_amount)
    """
    sub_dec = max(ZERO, to_decimal(subtotal))
    
    # 1. Discount Resolution
    disc_amt_input = to_decimal(discount_amount) if discount_amount is not None else None
    disc_pct_input = to_decimal(discount_percentage) if discount_percentage is not None else None

    final_discount_amount = ZERO
    final_discount_pct = ZERO

    if disc_amt_input is not None and disc_amt_input > ZERO:
        final_discount_amount = min(sub_dec, max(ZERO, disc_amt_input))
        if sub_dec > ZERO:
            final_discount_pct = ((final_discount_amount / sub_dec) * Decimal("100")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            final_discount_pct = min(HUNDRED, max(ZERO, final_discount_pct))
    elif disc_pct_input is not None and disc_pct_input > ZERO:
        final_discount_pct = min(HUNDRED, max(ZERO, disc_pct_input))
        if sub_dec > ZERO:
            final_discount_amount = (sub_dec * (final_discount_pct / Decimal("100"))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            final_discount_amount = min(sub_dec, max(ZERO, final_discount_amount))

    # 2. Taxable Amount
    taxable_amount = max(ZERO, sub_dec - final_discount_amount)

    # 3. Tax Resolution
    tax_amt_input = to_decimal(tax_amount) if tax_amount is not None else None
    tax_pct_input = to_decimal(tax_percentage) if tax_percentage is not None else None

    final_tax_amount = ZERO
    final_tax_pct = ZERO

    if tax_amt_input is not None and tax_amt_input >= ZERO and tax_pct_input is None:
        final_tax_amount = max(ZERO, tax_amt_input)
        if taxable_amount > ZERO:
            final_tax_pct = ((final_tax_amount / taxable_amount) * Decimal("100")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif tax_pct_input is not None and tax_pct_input >= ZERO:
        final_tax_pct = max(ZERO, tax_pct_input)
        if taxable_amount > ZERO:
            final_tax_amount = (taxable_amount * (final_tax_pct / Decimal("100"))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    elif tax_amt_input is not None and tax_amt_input >= ZERO:
        final_tax_amount = max(ZERO, tax_amt_input)
        if taxable_amount > ZERO:
            final_tax_pct = ((final_tax_amount / taxable_amount) * Decimal("100")).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    # 4. Freight and Additional Charges
    freight = max(ZERO, to_decimal(freight_charges))
    additional = max(ZERO, to_decimal(additional_charges))

    # 5. Grand Total and Balances
    grand_total = max(ZERO, taxable_amount + final_tax_amount + freight + additional)
    paid = max(ZERO, to_decimal(paid_amount))
    balance_due = max(ZERO, grand_total - paid)

    return {
        "subtotal": sub_dec,
        "discount_amount": final_discount_amount,
        "discount_percentage": final_discount_pct,
        "taxable_amount": taxable_amount,
        "tax_amount": final_tax_amount,
        "tax_percentage": final_tax_pct,
        "freight_charges": freight,
        "additional_charges": additional,
        "grand_total": grand_total,
        "total_amount": grand_total,
        "paid_amount": paid,
        "balance_due": balance_due,
        "outstanding_amount": balance_due,
    }


def calculate_invoice_totals(
    items: List[Dict[str, Any]],
    discount_amount: Optional[float] = None,
    discount_percentage: Optional[float] = None,
    tax_amount: Optional[float] = None,
    tax_percentage: Optional[float] = None,
    freight_charges: float = 0.0,
    additional_charges: float = 0.0,
    paid_amount: float = 0.0,
) -> Dict[str, float]:
    """
    Computes subtotal from items list and applies authoritative financial calculations.
    Returns float dictionary matching existing caller signatures.
    """
    subtotal = ZERO
    calculated_tax = ZERO

    for item in items:
        qty = max(ZERO, to_decimal(item.get("quantity", 0.0)))
        price = max(ZERO, to_decimal(item.get("unit_price", 0.0)))
        item_tax_rate = max(ZERO, min(HUNDRED, to_decimal(item.get("tax_rate", 0.0))))
        
        line_sub = (qty * price).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        subtotal += line_sub
        if item_tax_rate > ZERO:
            calculated_tax += (line_sub * (item_tax_rate / Decimal("100"))).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    tax_arg = tax_amount
    if tax_amount is None and tax_percentage is None and calculated_tax > ZERO:
        tax_arg = float(calculated_tax)

    computed = calculate_authoritative_financials(
        subtotal=subtotal,
        discount_amount=discount_amount,
        discount_percentage=discount_percentage,
        tax_amount=tax_arg,
        tax_percentage=tax_percentage,
        freight_charges=freight_charges,
        additional_charges=additional_charges,
        paid_amount=paid_amount,
    )

    return {k: float(v) for k, v in computed.items()}
