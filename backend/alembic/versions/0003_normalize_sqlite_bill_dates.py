"""normalize SQLite date backfills

Revision ID: 0003_normalize_bill_dates
Revises: 0002_add_bill_dates
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa


revision = "0003_normalize_bill_dates"
down_revision = "0002_add_bill_dates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        return
    for table, column in (
        ("sales", "bill_date"),
        ("purchases", "bill_date"),
        ("inventory_movements", "transaction_date"),
    ):
        op.execute(sa.text(
            f"UPDATE {table} SET {column} = date(created_at) "
            f"WHERE typeof({column}) != 'text' OR length({column}) != 10"
        ))


def downgrade() -> None:
    pass
