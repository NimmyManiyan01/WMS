"""
Script to sanitize corrupted development financial data.
Targets:
- Quotation 431c5008-e60b-4b6c-8513-6f993fff3735
- Purchase Order be3f4928-ce0e-4c79-9ca0-498c95d89392 (PO-2026-0002)
"""
import asyncio
from decimal import Decimal
from sqlalchemy import text
from app.database.session import AsyncSessionFactory
from app.modules.finance.domain.calculations import calculate_authoritative_financials

async def sanitize():
    async with AsyncSessionFactory() as session:
        subtotal = Decimal("998400.00")
        disc_pct = Decimal("10.00")
        tax_pct = Decimal("18.00")
        freight = Decimal("500.00")
        add_charges = Decimal("0.00")

        fin = calculate_authoritative_financials(
            subtotal=subtotal,
            discount_percentage=disc_pct,
            tax_percentage=tax_pct,
            freight_charges=freight,
            additional_charges=add_charges,
        )

        print("Calculated Authoritative Financials for Sanitization:")
        for k, v in fin.items():
            print(f"  {k}: {v}")

        # Update Quotation
        await session.execute(
            text("""
                UPDATE quotation
                SET discount = :disc_pct,
                    tax = :tax_pct,
                    freight_charges = :freight,
                    additional_charges = :add_charges,
                    total_amount = :grand_total
                WHERE id = '431c5008-e60b-4b6c-8513-6f993fff3735'
            """),
            {
                "disc_pct": fin["discount_percentage"],
                "tax_pct": fin["tax_percentage"],
                "freight": fin["freight_charges"],
                "add_charges": fin["additional_charges"],
                "grand_total": fin["grand_total"],
            }
        )

        # Update Purchase Order
        await session.execute(
            text("""
                UPDATE purchase_order
                SET subtotal = :subtotal,
                    discount_amount = :disc_amt,
                    tax_amount = :tax_amt,
                    freight_charges = :freight,
                    additional_charges = :add_charges,
                    total_amount = :grand_total
                WHERE id = 'be3f4928-ce0e-4c79-9ca0-498c95d89392'
                   OR po_number = 'PO-2026-0002'
            """),
            {
                "subtotal": fin["subtotal"],
                "disc_amt": fin["discount_amount"],
                "tax_amt": fin["tax_amount"],
                "freight": fin["freight_charges"],
                "add_charges": fin["additional_charges"],
                "grand_total": fin["grand_total"],
            }
        )

        await session.commit()
        print("Successfully sanitized quotation and purchase order financial records.")

if __name__ == "__main__":
    asyncio.run(sanitize())
