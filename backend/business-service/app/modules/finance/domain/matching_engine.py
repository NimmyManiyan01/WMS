"""
3-Way Matching Engine: Purchase Order (PO) + Goods Receipt (GRN) + Supplier Invoice.
Checks quantity variances, unit price variances, and generates exceptions.
"""
from typing import List, Dict, Any, Tuple
from decimal import Decimal
from app.modules.finance.domain.calculations import round_curr

DEFAULT_PRICE_TOLERANCE_PCT = 2.0  # 2% allowed price variance
DEFAULT_QTY_TOLERANCE_PCT = 0.0    # Cannot invoice more than received goods

class MatchingResult:
    def __init__(
        self,
        match_status: str,
        po_matched: bool,
        grn_matched: bool,
        price_matched: bool,
        qty_matched: bool,
        line_results: List[Dict[str, Any]],
        exceptions: List[Dict[str, Any]],
        po_total: float,
        grn_total: float,
        invoice_total: float,
        discrepancy_amount: float,
    ):
        self.match_status = match_status
        self.po_matched = po_matched
        self.grn_matched = grn_matched
        self.price_matched = price_matched
        self.qty_matched = qty_matched
        self.line_results = line_results
        self.exceptions = exceptions
        self.po_total = po_total
        self.grn_total = grn_total
        self.invoice_total = invoice_total
        self.discrepancy_amount = discrepancy_amount

    def to_dict(self) -> Dict[str, Any]:
        return {
            "match_status": self.match_status,
            "po_matched": self.po_matched,
            "grn_matched": self.grn_matched,
            "price_matched": self.price_matched,
            "qty_matched": self.qty_matched,
            "line_results": self.line_results,
            "exceptions": self.exceptions,
            "po_total": self.po_total,
            "grn_total": self.grn_total,
            "invoice_total": self.invoice_total,
            "discrepancy_amount": self.discrepancy_amount,
        }

def match_three_way(
    invoice_items: List[Dict[str, Any]],
    po_items: List[Dict[str, Any]],
    grn_lines: List[Dict[str, Any]],
    invoice_grand_total: float,
    po_grand_total: float,
    price_tolerance_pct: float = DEFAULT_PRICE_TOLERANCE_PCT,
    qty_tolerance_pct: float = DEFAULT_QTY_TOLERANCE_PCT,
) -> MatchingResult:
    """
    Executes line-by-line 3-way matching across PO, GRN lines, and Invoice items.
    """
    line_results = []
    exceptions = []

    # Map PO items by item_code or material_id or id
    po_map = {}
    for p in po_items:
        key = str(p.get("item_code") or p.get("material_id") or p.get("id"))
        po_map[key] = p

    # Map GRN lines by item_code or material_id or po_line_id
    grn_map = {}
    grn_total_val = 0.0
    for g in grn_lines:
        key = str(g.get("item_code") or g.get("material_id") or g.get("purchase_order_item_id") or g.get("id"))
        grn_map[key] = g
        # GRN value = good_quantity (or received_quantity) * unit price from PO if available
        good_qty = float(g.get("good_quantity") if g.get("good_quantity") is not None else g.get("received_quantity", 0.0))
        unit_p = float(g.get("unit_price") or 0.0)
        grn_total_val += round_curr(good_qty * unit_p)

    all_price_matched = True
    all_qty_matched = True
    any_tolerance_warning = False

    for inv_item in invoice_items:
        key = str(inv_item.get("item_code") or inv_item.get("material_id") or inv_item.get("po_line_id") or "")
        
        # Best effort lookup
        po_item = po_map.get(key)
        if not po_item:
            # Fallback by description or first item if 1:1
            if len(po_items) == 1 and len(invoice_items) == 1:
                po_item = po_items[0]
            else:
                for p in po_items:
                    if p.get("item_name") == inv_item.get("item_name") or p.get("description") == inv_item.get("description"):
                        po_item = p
                        break

        grn_item = grn_map.get(key)
        if not grn_item:
            if len(grn_lines) == 1 and len(invoice_items) == 1:
                grn_item = grn_lines[0]
            else:
                for g in grn_lines:
                    if g.get("item_name") == inv_item.get("item_name") or g.get("item_code") == inv_item.get("item_code"):
                        grn_item = g
                        break

        inv_qty = float(inv_item.get("quantity", 0.0))
        inv_price = float(inv_item.get("unit_price", 0.0))
        po_qty = float(po_item.get("quantity", 0.0)) if po_item else 0.0
        po_price = float(po_item.get("unit_price", 0.0)) if po_item else 0.0
        grn_qty = float(grn_item.get("good_quantity") if grn_item and grn_item.get("good_quantity") is not None else (grn_item.get("received_quantity", 0.0) if grn_item else 0.0))

        # Check Qty: Billed quantity should not exceed received quantity (grn_qty)
        qty_diff = round_curr(inv_qty - grn_qty)
        qty_status = "MATCHED"
        if grn_qty <= 0 and inv_qty > 0:
            qty_status = "UNRECEIVED_GOODS"
            all_qty_matched = False
            exceptions.append({
                "exception_type": "UNRECEIVED_GOODS",
                "severity": "CRITICAL",
                "message": f"Line '{inv_item.get('item_name', key)}' billed for {inv_qty} units but 0 received in GRN.",
                "variance_amount": round_curr(inv_qty * inv_price),
            })
        elif qty_diff > 0:
            qty_status = "EXCESS_BILLED"
            all_qty_matched = False
            exceptions.append({
                "exception_type": "QTY_VARIANCE",
                "severity": "HIGH",
                "message": f"Line '{inv_item.get('item_name', key)}' billed quantity ({inv_qty}) exceeds GRN accepted quantity ({grn_qty}) by {qty_diff}.",
                "variance_amount": round_curr(qty_diff * inv_price),
            })

        # Check Price: Billed unit price vs PO agreed price
        price_diff = round_curr(inv_price - po_price)
        price_diff_pct = round_curr((price_diff / po_price * 100.0)) if po_price > 0 else 0.0
        price_status = "MATCHED"
        if po_price > 0:
            if price_diff > 0:
                if price_diff_pct <= price_tolerance_pct:
                    price_status = "TOLERANCE_WARNING"
                    any_tolerance_warning = True
                    exceptions.append({
                        "exception_type": "PRICE_VARIANCE_WARNING",
                        "severity": "LOW",
                        "message": f"Line '{inv_item.get('item_name', key)}' price ₹{inv_price} is {price_diff_pct}% above PO price ₹{po_price} (within {price_tolerance_pct}% tolerance).",
                        "variance_amount": round_curr(price_diff * inv_qty),
                    })
                else:
                    price_status = "PRICE_EXCEEDED"
                    all_price_matched = False
                    exceptions.append({
                        "exception_type": "PRICE_VARIANCE",
                        "severity": "HIGH",
                        "message": f"Line '{inv_item.get('item_name', key)}' price ₹{inv_price} exceeds PO price ₹{po_price} by {price_diff_pct}% (exceeds {price_tolerance_pct}% limit).",
                        "variance_amount": round_curr(price_diff * inv_qty),
                    })
            elif price_diff < 0:
                price_status = "FAVORABLE_VARIANCE"

        line_results.append({
            "item_name": inv_item.get("item_name") or inv_item.get("description", "Item"),
            "item_code": inv_item.get("item_code", ""),
            "po_quantity": po_qty,
            "po_unit_price": po_price,
            "grn_quantity": grn_qty,
            "invoice_quantity": inv_qty,
            "invoice_unit_price": inv_price,
            "qty_status": qty_status,
            "price_status": price_status,
            "line_variance": round_curr((inv_qty * inv_price) - (grn_qty * po_price)),
        })

    po_matched = len(po_items) > 0
    grn_matched = len(grn_lines) > 0

    discrepancy_amount = round_curr(abs(invoice_grand_total - po_grand_total))
    if not po_matched or not grn_matched:
        match_status = "DISCREPANCY"
    elif not all_price_matched or not all_qty_matched:
        match_status = "DISCREPANCY"
    elif any_tolerance_warning:
        match_status = "TOLERANCE_WARNING"
    else:
        match_status = "MATCHED"

    return MatchingResult(
        match_status=match_status,
        po_matched=po_matched,
        grn_matched=grn_matched,
        price_matched=all_price_matched,
        qty_matched=all_qty_matched,
        line_results=line_results,
        exceptions=exceptions,
        po_total=round_curr(po_grand_total),
        grn_total=round_curr(grn_total_val),
        invoice_total=round_curr(invoice_grand_total),
        discrepancy_amount=discrepancy_amount,
    )
