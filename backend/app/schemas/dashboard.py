from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    today_sales: Decimal
    today_profit: Decimal
    monthly_sales: Decimal
    monthly_profit: Decimal
    monthly_expenses: Decimal
    gross_margin_percentage: Decimal
    average_order_value: Decimal
    low_stock: int
    dead_stock: int
    total_skus: int
    total_stock_units: int
    total_customers: int
    pending_payments: Decimal
    blocked_inventory_value: Decimal
    top_selling_products: list[dict]
    recent_sales: list[dict]
    sales_trend: list[dict]
    monthly_distribution: list[dict]
    category_performance: list[dict]
    expense_breakdown: list[dict]
    stock_risk: list[dict]
    business_health_summary: str

