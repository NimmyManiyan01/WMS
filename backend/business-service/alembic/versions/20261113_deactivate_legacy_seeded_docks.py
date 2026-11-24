"""Deactivate legacy hard-coded dock master records.

Revision ID: 20261113_deactivate_legacy_seeded_docks
Revises: 20261110_admin_user_management
Create Date: 2026-11-13
"""

from alembic import op
import sqlalchemy as sa


revision = "20261113_deactivate_legacy_seeded_docks"
down_revision = "20261110_admin_user_management"
branch_labels = None
depends_on = None


LEGACY_DOCKS = """
    VALUES
      ('RM-01', 'Raw Material Dock 01', 'RAW_MATERIAL', 'North Warehouse'),
      ('RM-02', 'Raw Material Dock 02', 'RAW_MATERIAL', 'East Warehouse'),
      ('CH-01', 'Chemical/Hazardous Dock 01', 'CHEMICAL_HAZARDOUS', 'South Warehouse'),
      ('CH-02', 'Chemical/Hazardous Dock 02', 'CHEMICAL_HAZARDOUS', 'South Warehouse'),
      ('EL-01', 'Electrical Dock 01', 'ELECTRICAL', 'North Warehouse'),
      ('EL-02', 'Electrical Dock 02', 'ELECTRICAL', 'North Warehouse'),
      ('EC-01', 'Electronics Dock 01', 'ELECTRONICS', 'West Warehouse'),
      ('EC-02', 'Electronics Dock 02', 'ELECTRONICS', 'West Warehouse'),
      ('MR-01', 'Main Receiving Dock', 'MAIN_RECEIVING', 'North Warehouse')
"""


def upgrade() -> None:
    bind = op.get_bind()
    if "dock_masters" not in sa.inspect(bind).get_table_names():
        return

    # Match the complete seed signature so a user-created dock that happens to
    # reuse a code or type remains active. Historical allocation references are
    # preserved; inactive docks simply disappear from operational dock lists.
    bind.execute(sa.text(f"""
        WITH legacy(code, name, type, location) AS ({LEGACY_DOCKS})
        UPDATE dock_masters AS dock
        SET is_active = FALSE
        FROM legacy
        WHERE dock.dock_code = legacy.code
          AND dock.dock_name = legacy.name
          AND dock.dock_type = legacy.type
          AND dock.location = legacy.location
    """))


def downgrade() -> None:
    bind = op.get_bind()
    if "dock_masters" not in sa.inspect(bind).get_table_names():
        return

    bind.execute(sa.text(f"""
        WITH legacy(code, name, type, location) AS ({LEGACY_DOCKS})
        UPDATE dock_masters AS dock
        SET is_active = TRUE
        FROM legacy
        WHERE dock.dock_code = legacy.code
          AND dock.dock_name = legacy.name
          AND dock.dock_type = legacy.type
          AND dock.location = legacy.location
    """))
