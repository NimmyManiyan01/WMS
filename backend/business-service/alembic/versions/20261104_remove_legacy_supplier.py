"""Remove the obsolete legacy supplier and its demo purchase order.

Revision ID: 20261104_remove_legacy_supplier
Revises: 20261006_asn_logistics
Create Date: 2026-11-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20261104_remove_legacy_supplier"
down_revision = "20261006_asn_logistics"
branch_labels = None
depends_on = None


LEGACY_SUPPLIER_ID = "00000000-0000-0000-0000-000000000001"
LEGACY_PURCHASE_ORDER_ID = "11111111-1111-1111-1111-111111111111"


def upgrade() -> None:
    bind = op.get_bind()

    # Delete only the original demo PO when it is still owned by the fixed
    # legacy supplier. This protects a row if either identifier was repurposed.
    bind.execute(
        sa.text(
            """
            DELETE FROM purchase_order
            WHERE id = CAST(:po_id AS uuid)
              AND supplier_id = CAST(:supplier_id AS uuid)
            """
        ),
        {"po_id": LEGACY_PURCHASE_ORDER_ID, "supplier_id": LEGACY_SUPPLIER_ID},
    )

    bind.execute(
        sa.text(
            """
            DELETE FROM supplier
            WHERE id = CAST(:supplier_id AS uuid)
              AND supplier_name = 'Legacy Supplier'
            """
        ),
        {"supplier_id": LEGACY_SUPPLIER_ID},
    )


def downgrade() -> None:
    # Intentionally do not recreate obsolete demo data.
    pass
