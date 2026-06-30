"""add bill and inventory transaction dates

Revision ID: 0002_add_bill_dates
Revises: 0001_initial_schema
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_add_bill_dates"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def _add_backfilled_date(table: str, column: str, index_name: str) -> None:
    bind = op.get_bind()
    existing_columns = {item["name"] for item in sa.inspect(bind).get_columns(table)}
    if column in existing_columns:
        return
    op.add_column(table, sa.Column(column, sa.Date(), nullable=True))
    date_expression = "date(created_at)" if bind.dialect.name == "sqlite" else "CAST(created_at AS DATE)"
    op.execute(sa.text(f"UPDATE {table} SET {column} = {date_expression}"))
    with op.batch_alter_table(table) as batch_op:
        batch_op.alter_column(column, existing_type=sa.Date(), nullable=False)
        batch_op.create_index(index_name, [column], unique=False)


def upgrade() -> None:
    _add_backfilled_date("sales", "bill_date", "ix_sales_bill_date")
    _add_backfilled_date("purchases", "bill_date", "ix_purchases_bill_date")
    _add_backfilled_date("inventory_movements", "transaction_date", "ix_inventory_movements_transaction_date")


def downgrade() -> None:
    for table, column, index_name in (
        ("inventory_movements", "transaction_date", "ix_inventory_movements_transaction_date"),
        ("purchases", "bill_date", "ix_purchases_bill_date"),
        ("sales", "bill_date", "ix_sales_bill_date"),
    ):
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_index(index_name)
            batch_op.drop_column(column)
