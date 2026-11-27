"""Return automatically approved material requests to manager review."""

from alembic import op
import sqlalchemy as sa

revision = "20261125_restore_mr_approval"
down_revision = "20261120_putaway_tasks_per_batch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    requests = sa.table(
        "material_request",
        sa.column("request_number", sa.String()),
        sa.column("status", sa.String()),
        sa.column("approval_history", sa.JSON()),
    )
    connection = op.get_bind()
    rows = connection.execute(
        sa.select(requests.c.request_number, requests.c.approval_history)
        .where(requests.c.status == "Approved")
    ).all()
    for number, history in rows:
        if not isinstance(history, list) or len(history) != 1:
            continue
        entry = history[0]
        if not isinstance(entry, dict) or (
            entry.get("status") != "Approved"
            or entry.get("comments") != "Material request submitted directly to Procurement"
        ):
            continue
        connection.execute(
            requests.update()
            .where(requests.c.request_number == number, requests.c.status == "Approved")
            .values(
                status="Submitted",
                approval_history=[{
                    **entry,
                    "status": "Submitted",
                    "comments": "Material request submitted for manager approval",
                }],
            )
        )


def downgrade() -> None:
    # A schema rollback must not grant approval to a pending request.
    pass
