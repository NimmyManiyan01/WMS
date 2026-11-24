"""Remove invoice and challan details from ASNs.

Revision ID: 20261120_remove_asn_invoice_challan
Revises: 20261113_deactivate_legacy_seeded_docks
Create Date: 2026-11-20
"""

from alembic import op
import sqlalchemy as sa


revision = "20261120_remove_asn_invoice_challan"
down_revision = "20261113_deactivate_legacy_seeded_docks"
branch_labels = None
depends_on = None


ASN_DOCUMENT_COLUMNS = (
    "invoice_number",
    "invoice_date",
    "challan_number",
    "challan_date",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "asn" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("asn")}
    with op.batch_alter_table("asn") as batch_op:
        for column_name in ASN_DOCUMENT_COLUMNS:
            if column_name in existing_columns:
                batch_op.drop_column(column_name)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "asn" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("asn")}
    columns = (
        sa.Column("invoice_number", sa.String(length=128), nullable=True),
        sa.Column("invoice_date", sa.Date(), nullable=True),
        sa.Column("challan_number", sa.String(length=128), nullable=True),
        sa.Column("challan_date", sa.Date(), nullable=True),
    )
    with op.batch_alter_table("asn") as batch_op:
        for column in columns:
            if column.name not in existing_columns:
                batch_op.add_column(column)
