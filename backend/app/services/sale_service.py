from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.catalog import Product
from app.models.enums import InventoryMovementType, PaymentStatus, ProductStatus
from app.models.inventory import InventoryMovement
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.schemas.sale import SaleCreate
from app.services.customer_service import get_or_create_customer


def _invoice_number() -> str:
    return "INV-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")


def _payment_status(total: Decimal, paid: Decimal) -> PaymentStatus:
    if paid <= 0:
        return PaymentStatus.unpaid
    if paid < total:
        return PaymentStatus.partial
    return PaymentStatus.paid


def create_sale(db: Session, payload: SaleCreate, current_user: User) -> Sale:
    customer = get_or_create_customer(db, payload.customer_name, payload.customer_phone, payload.customer_address)
    sale = Sale(
        customer_id=customer.id,
        invoice_number=_invoice_number(),
        bill_date=payload.bill_date,
        discount=payload.discount,
        tax=payload.tax,
        payment_amount=payload.payment_amount,
        created_by_user_id=current_user.id,
    )
    db.add(sale)
    db.flush()

    subtotal = Decimal("0")
    profit = Decimal("0")
    for item in payload.items:
        product = db.get(Product, item.product_id, with_for_update=True)
        if product is None:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.current_stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

        gross_line_total = item.unit_selling_price * item.quantity
        if item.discount > gross_line_total:
            raise HTTPException(status_code=400, detail=f"Item discount exceeds the value of {product.name}")
        line_total = gross_line_total - item.discount
        line_profit = ((item.unit_selling_price - product.purchase_price) * item.quantity) - item.discount
        subtotal += line_total
        profit += line_profit
        product.current_stock -= item.quantity
        product.status = ProductStatus.in_stock if product.current_stock > 0 else ProductStatus.sold_gone_from_store

        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_purchase_price=product.purchase_price,
                unit_selling_price=item.unit_selling_price,
                discount=item.discount,
                line_total=line_total,
                line_profit=line_profit,
            )
        )
        db.add(
            InventoryMovement(
                product_id=product.id,
                movement_type=InventoryMovementType.sale_out,
                quantity=item.quantity,
                reference_type="sale",
                reference_id=sale.id,
                note=f"Sale invoice {sale.invoice_number}",
                transaction_date=sale.bill_date,
            )
        )

    if payload.discount > subtotal:
        raise HTTPException(status_code=400, detail="Bill discount cannot exceed the subtotal")
    total = subtotal - payload.discount + payload.tax
    if total <= 0:
        raise HTTPException(status_code=400, detail="Bill total must be greater than zero")
    if payload.payment_amount > total:
        raise HTTPException(status_code=400, detail="Payment cannot exceed the bill total")

    sale.subtotal = subtotal
    sale.total = total
    sale.profit_amount = profit - payload.discount
    sale.payment_status = _payment_status(total, payload.payment_amount)
    db.commit()
    db.refresh(sale)
    return sale


def list_due_sales(db: Session) -> list[Sale]:
    return (
        db.query(Sale)
        .filter(Sale.payment_amount < Sale.total)
        .order_by(Sale.bill_date.desc(), Sale.created_at.desc())
        .all()
    )


def record_sale_payment(db: Session, sale_id: int, amount: Decimal) -> Sale:
    sale = db.get(Sale, sale_id, with_for_update=True)
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    due = sale.total - sale.payment_amount
    if due <= 0:
        raise HTTPException(status_code=400, detail="This bill is already fully paid")
    sale.payment_amount += min(amount, due)
    sale.payment_status = _payment_status(sale.total, sale.payment_amount)
    db.commit()
    db.refresh(sale)
    return sale
