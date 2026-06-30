from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.catalog import Product
from app.models.enums import InventoryMovementType, ProductStatus
from app.models.inventory import InventoryMovement
from app.models.purchase import Purchase, PurchaseItem
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseItemCreate
from app.services.catalog_service import get_or_create_category, get_or_create_supplier


def _resolve_product(db: Session, item: PurchaseItemCreate, supplier_id: int | None) -> Product:
    if item.product_id is not None:
        product = db.get(Product, item.product_id, with_for_update=True)
        if product is None:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        return product

    name = (item.name or "").strip()
    brand = (item.brand or "").strip()
    if name and brand:
        existing = (
            db.query(Product)
            .filter(func.lower(Product.name) == name.lower(), func.lower(Product.brand) == brand.lower())
            .with_for_update()
            .first()
        )
        if existing is not None:
            return existing

    category_name = (item.category_name or "").strip()
    if not name or not category_name or not brand or item.selling_price is None:
        raise HTTPException(
            status_code=400,
            detail="A new buying item requires product name, category, brand, and retail selling price",
        )

    category = get_or_create_category(db, category_name)
    product = Product(
        category_id=category.id,
        supplier_id=supplier_id,
        brand=brand,
        name=name,
        purchase_price=item.unit_cost,
        selling_price=item.selling_price,
        current_stock=0,
        minimum_stock=0,
        warranty_months=0,
        status=ProductStatus.sold_gone_from_store,
    )
    db.add(product)
    db.flush()
    return product


def create_purchase(db: Session, payload: PurchaseCreate, current_user: User) -> Purchase:
    supplier = get_or_create_supplier(db, payload.supplier_name, payload.supplier_phone)
    supplier_id = supplier.id if supplier else None
    purchase = Purchase(
        supplier_id=supplier_id,
        invoice_number=payload.invoice_number,
        bill_date=payload.bill_date,
        tax=payload.tax,
        payment_amount=payload.payment_amount,
        created_by_user_id=current_user.id,
    )
    db.add(purchase)
    db.flush()

    subtotal = Decimal("0")
    for item in payload.items:
        product = _resolve_product(db, item, supplier_id)
        line_total = item.unit_cost * item.quantity
        subtotal += line_total
        product.current_stock += item.quantity
        product.purchase_price = item.unit_cost
        product.status = ProductStatus.in_stock
        db.add(
            PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                line_total=line_total,
            )
        )
        db.add(
            InventoryMovement(
                product_id=product.id,
                movement_type=InventoryMovementType.purchase_in,
                quantity=item.quantity,
                reference_type="purchase",
                reference_id=purchase.id,
                note=f"Purchase bill {purchase.invoice_number}",
                transaction_date=purchase.bill_date,
            )
        )

    purchase.subtotal = subtotal
    purchase.total = subtotal + payload.tax
    if payload.payment_amount > purchase.total:
        raise HTTPException(status_code=400, detail="Payment cannot exceed the purchase total")
    if supplier and payload.payment_amount < purchase.total:
        supplier.outstanding_amount += purchase.total - payload.payment_amount
    db.commit()
    db.refresh(purchase)
    return purchase


def list_due_purchases(db: Session) -> list[Purchase]:
    return (
        db.query(Purchase)
        .filter(Purchase.payment_amount < Purchase.total)
        .order_by(Purchase.bill_date.desc(), Purchase.created_at.desc())
        .all()
    )


def record_purchase_payment(db: Session, purchase_id: int, amount: Decimal) -> Purchase:
    purchase = db.get(Purchase, purchase_id, with_for_update=True)
    if purchase is None:
        raise HTTPException(status_code=404, detail="Purchase not found")
    due = purchase.total - purchase.payment_amount
    if due <= 0:
        raise HTTPException(status_code=400, detail="This supplier bill is already fully paid")
    paid_now = min(amount, due)
    purchase.payment_amount += paid_now
    if purchase.supplier:
        purchase.supplier.outstanding_amount = max(
            purchase.supplier.outstanding_amount - paid_now,
            Decimal("0"),
        )
    db.commit()
    db.refresh(purchase)
    return purchase
