from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.catalog import Category, Product
from app.models.customer import Customer
from app.models.expense import Expense
from app.models.sale import Sale, SaleItem
from app.schemas.dashboard import DashboardSummary


ZERO = Decimal("0")


def _percent(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def dashboard_summary(db: Session) -> DashboardSummary:
    today = datetime.now(timezone.utc).date()
    month = today.month
    year = today.year

    sales = db.query(Sale).order_by(Sale.bill_date.desc(), Sale.created_at.desc()).all()
    today_rows = [sale for sale in sales if sale.bill_date == today]
    month_rows = [sale for sale in sales if sale.bill_date.month == month and sale.bill_date.year == year]
    today_sales = sum((sale.total for sale in today_rows), ZERO)
    today_gross_profit = sum((sale.profit_amount for sale in today_rows), ZERO)
    month_sales = sum((sale.total for sale in month_rows), ZERO)
    month_gross_profit = sum((sale.profit_amount for sale in month_rows), ZERO)

    expenses = db.query(Expense).all()
    today_expenses = sum((expense.amount for expense in expenses if expense.expense_date == today), ZERO)
    month_expense_rows = [expense for expense in expenses if expense.expense_date.month == month and expense.expense_date.year == year]
    month_expenses = sum((expense.amount for expense in month_expense_rows), ZERO)

    products = db.query(Product).order_by(Product.current_stock.asc()).all()
    low_products = [product for product in products if product.current_stock <= product.minimum_stock]
    dead_products = [product for product in products if product.current_stock == 0]
    pending = sum((max(sale.total - sale.payment_amount, ZERO) for sale in sales), ZERO)
    blocked_inventory = sum((product.current_stock * product.purchase_price for product in products), ZERO)

    top_rows = (
        db.query(Product.name, func.coalesce(func.sum(SaleItem.quantity), 0).label("sold_quantity"))
        .outerjoin(SaleItem, SaleItem.product_id == Product.id)
        .group_by(Product.id)
        .order_by(func.coalesce(func.sum(SaleItem.quantity), 0).desc())
        .limit(5)
        .all()
    )

    trend: list[dict] = []
    for offset in range(13, -1, -1):
        target = today - timedelta(days=offset)
        day_sales = [sale for sale in sales if sale.bill_date == target]
        trend.append({
            "date": target.isoformat(),
            "label": target.strftime("%d %b"),
            "sales": sum((sale.total for sale in day_sales), ZERO),
            "profit": sum((sale.profit_amount for sale in day_sales), ZERO),
            "orders": len(day_sales),
        })

    monthly_distribution: list[dict] = []
    first_of_month = today.replace(day=1)
    for offset in range(5, -1, -1):
        month_value = first_of_month.month - offset
        year_value = first_of_month.year
        while month_value <= 0:
            month_value += 12
            year_value -= 1
        month_sales_rows = [sale for sale in sales if sale.bill_date.month == month_value and sale.bill_date.year == year_value]
        monthly_distribution.append({
            "month": f"{year_value}-{month_value:02d}",
            "label": datetime(year_value, month_value, 1).strftime("%b %Y"),
            "sales": sum((sale.total for sale in month_sales_rows), ZERO),
            "profit": sum((sale.profit_amount for sale in month_sales_rows), ZERO),
            "orders": len(month_sales_rows),
        })
    category_totals: dict[str, dict[str, Decimal | int]] = defaultdict(lambda: {"revenue": ZERO, "profit": ZERO, "units": 0})
    category_rows = (
        db.query(Category.name, SaleItem.line_total, SaleItem.line_profit, SaleItem.quantity)
        .join(Product, Product.category_id == Category.id)
        .join(SaleItem, SaleItem.product_id == Product.id)
        .all()
    )
    for category_name, revenue, profit, units in category_rows:
        category_totals[category_name]["revenue"] += revenue
        category_totals[category_name]["profit"] += profit
        category_totals[category_name]["units"] += units

    expense_totals: dict[str, Decimal] = defaultdict(lambda: ZERO)
    for expense in month_expense_rows:
        expense_totals[expense.category.value] += expense.amount

    margin = _percent((month_gross_profit / month_sales) * 100) if month_sales else ZERO
    average_order = month_sales / len(month_rows) if month_rows else ZERO
    net_profit = month_gross_profit - month_expenses
    health = "Healthy"
    if low_products or pending > 0 or net_profit < 0:
        health = "Needs attention"
    if len(low_products) >= max(3, len(products) // 2) or net_profit < 0:
        health = "Action required"

    return DashboardSummary(
        today_sales=today_sales,
        today_profit=today_gross_profit - today_expenses,
        monthly_sales=month_sales,
        monthly_profit=net_profit,
        monthly_expenses=month_expenses,
        gross_margin_percentage=margin,
        average_order_value=average_order,
        low_stock=len(low_products),
        dead_stock=len(dead_products),
        total_skus=len(products),
        total_stock_units=sum(product.current_stock for product in products),
        total_customers=db.query(Customer).count(),
        pending_payments=pending,
        blocked_inventory_value=blocked_inventory,
        top_selling_products=[{"name": row.name, "sold_quantity": int(row.sold_quantity)} for row in top_rows],
        recent_sales=[{
            "id": sale.id,
            "invoice_number": sale.invoice_number,
            "customer_name": sale.customer.name if sale.customer else "Walk-in Customer",
            "total": sale.total,
            "profit": sale.profit_amount,
            "payment_status": sale.payment_status.value,
            "bill_date": sale.bill_date.isoformat(),
            "created_at": sale.created_at.isoformat(),
        } for sale in sales[:6]],
        sales_trend=trend,
        monthly_distribution=monthly_distribution,
        category_performance=[{"category": name, **values} for name, values in sorted(category_totals.items(), key=lambda item: item[1]["revenue"], reverse=True)],
        expense_breakdown=[{"category": name, "amount": amount} for name, amount in sorted(expense_totals.items(), key=lambda item: item[1], reverse=True)],
        stock_risk=[{
            "id": product.id,
            "name": product.name,
            "brand": product.brand,
            "current_stock": product.current_stock,
            "minimum_stock": product.minimum_stock,
            "reorder_quantity": max((product.minimum_stock * 2) - product.current_stock, 1),
        } for product in low_products[:6]],
        business_health_summary=health,
    )


