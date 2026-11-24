"""Create one putaway task per GRN batch.

Revision ID: 20261120_putaway_tasks_per_batch
Revises: 20261120_remove_asn_invoice_challan
Create Date: 2026-11-20
"""

from datetime import datetime, timezone
import uuid

from alembic import op
import sqlalchemy as sa


revision = "20261120_putaway_tasks_per_batch"
down_revision = "20261120_remove_asn_invoice_challan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "putaway_task" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("putaway_task")}
    if "batch_number" not in columns:
        op.add_column("putaway_task", sa.Column("batch_number", sa.String(128), nullable=True))

    constraints = {item["name"] for item in inspector.get_unique_constraints("putaway_task")}
    if "uq_putaway_task_grn_item" in constraints:
        op.drop_constraint("uq_putaway_task_grn_item", "putaway_task", type_="unique")

    aggregate_tasks = bind.execute(sa.text("""
        SELECT task.*
        FROM putaway_task AS task
        WHERE task.batch_number IS NULL
          AND task.grn_id IS NOT NULL
          AND task.status NOT IN ('PUTAWAY_COMPLETED', 'COMPLETED', 'STORED')
          AND EXISTS (
              SELECT 1
              FROM grn_batch AS batch
              JOIN grn_line AS line ON line.id = batch.grn_line_id
              WHERE line.grn_id = task.grn_id
                AND line.item_code = task.item_code
          )
    """)).mappings().all()

    for task in aggregate_tasks:
        batches = bind.execute(sa.text("""
            SELECT batch.batch_number, batch.batch_quantity
            FROM grn_batch AS batch
            JOIN grn_line AS line ON line.id = batch.grn_line_id
            WHERE line.grn_id = :grn_id AND line.item_code = :item_code
            ORDER BY batch.created_at, batch.id
        """), {"grn_id": task["grn_id"], "item_code": task["item_code"]}).mappings().all()
        if not batches:
            continue

        first = batches[0]
        bind.execute(sa.text("""
            UPDATE putaway_task
            SET batch_number = :batch_number, quantity = :quantity
            WHERE id = :task_id
        """), {
            "task_id": task["id"],
            "batch_number": first["batch_number"],
            "quantity": first["batch_quantity"],
        })

        for batch in batches[1:]:
            bind.execute(sa.text("""
                INSERT INTO putaway_task
                (id, task_number, grn_id, grn_number, item_code, batch_number,
                 material_name, quantity, uom, warehouse_id, source_location,
                 destination_store_id, assigned_to, assigned_by, assigned_at,
                 status, created_by, created_at)
                VALUES
                (:id, :task_number, :grn_id, :grn_number, :item_code, :batch_number,
                 :material_name, :quantity, :uom, :warehouse_id, :source_location,
                 :destination_store_id, :assigned_to, :assigned_by, :assigned_at,
                 'PUTAWAY_PENDING', :created_by, :created_at)
            """), {
                "id": uuid.uuid4(),
                "task_number": f"PT-{datetime.now(timezone.utc):%Y%m%d}-{uuid.uuid4().hex[:6].upper()}",
                "grn_id": task["grn_id"],
                "grn_number": task["grn_number"],
                "item_code": task["item_code"],
                "batch_number": batch["batch_number"],
                "material_name": task["material_name"],
                "quantity": batch["batch_quantity"],
                "uom": task["uom"],
                "warehouse_id": task["warehouse_id"],
                "source_location": task["source_location"],
                "destination_store_id": task["destination_store_id"],
                "assigned_to": task["assigned_to"],
                "assigned_by": task["assigned_by"],
                "assigned_at": task["assigned_at"],
                "created_by": task["created_by"],
                "created_at": datetime.now(timezone.utc),
            })

    inspector = sa.inspect(bind)
    constraints = {item["name"] for item in inspector.get_unique_constraints("putaway_task")}
    if "uq_putaway_task_grn_item_batch" not in constraints:
        op.create_unique_constraint(
            "uq_putaway_task_grn_item_batch",
            "putaway_task",
            ["grn_id", "item_code", "batch_number"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "putaway_task" not in inspector.get_table_names():
        return
    constraints = {item["name"] for item in inspector.get_unique_constraints("putaway_task")}
    if "uq_putaway_task_grn_item_batch" in constraints:
        op.drop_constraint("uq_putaway_task_grn_item_batch", "putaway_task", type_="unique")
    bind.execute(sa.text("""
        DELETE FROM putaway_task AS duplicate
        USING putaway_task AS keeper
        WHERE duplicate.grn_id = keeper.grn_id
          AND duplicate.item_code = keeper.item_code
          AND duplicate.created_at > keeper.created_at
    """))
    op.create_unique_constraint(
        "uq_putaway_task_grn_item",
        "putaway_task",
        ["grn_id", "item_code"],
    )
