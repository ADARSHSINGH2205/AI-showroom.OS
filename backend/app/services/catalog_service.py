from decimal import Decimal
from typing import Literal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.catalog import Category, Product, Supplier
from app.models.enums import InventoryMovementType, PaymentStatus, ProductStatus
from app.models.inventory import InventoryMovement
from app.models.purchase import Purchase, PurchaseItem
from app.models.sale import Sale, SaleItem
from app.schemas.product import ProductCreate


ProductDeleteMode = Literal["stock_only", "purge_all"]
ZERO = Decimal("0")


def get_or_create_category(db: Session, name: str) -> Category:
    category = db.query(Category).filter(Category.name == name).first()
    if category:
        return category
    category = Category(name=name)
    db.add(category)
    db.flush()
    return category


def get_or_create_supplier(db: Session, name: str | None, phone: str | None = None) -> Supplier | None:
    if not name:
        return None
    supplier = db.query(Supplier).filter(Supplier.name == name).first()
    if supplier:
        if phone and not supplier.phone:
            supplier.phone = phone
        return supplier
    supplier = Supplier(name=name, phone=phone)
    db.add(supplier)
    db.flush()
    return supplier


def list_products(db: Session) -> list[Product]:
    return db.query(Product).order_by(Product.name).all()


def create_product(db: Session, payload: ProductCreate) -> Product:
    category = get_or_create_category(db, payload.category_name)
    supplier = get_or_create_supplier(db, payload.supplier_name)
    product = Product(
        category_id=category.id,
        supplier_id=supplier.id if supplier else None,
        brand=payload.brand,
        name=payload.name,
        description=payload.description,
        purchase_price=payload.purchase_price,
        selling_price=payload.selling_price,
        warranty_months=payload.warranty_months,
        image_url=payload.image_url,
        barcode=payload.barcode,
        current_stock=0,
        minimum_stock=payload.minimum_stock,
        status=ProductStatus.sold_gone_from_store,
    )
    db.add(product)
    db.flush()

    if payload.opening_stock > 0:
        product.current_stock = payload.opening_stock
        product.status = ProductStatus.in_stock
        db.add(InventoryMovement(product_id=product.id, movement_type=InventoryMovementType.purchase_in, quantity=payload.opening_stock, note="Opening stock"))

    db.commit()
    db.refresh(product)
    return product


def _payment_status(total: Decimal, paid: Decimal) -> PaymentStatus:
    if paid <= 0:
        return PaymentStatus.unpaid
    if paid < total:
        return PaymentStatus.partial
    return PaymentStatus.paid


def _remove_current_stock_only(db: Session, product: Product) -> None:
    if product.current_stock > 0:
        db.add(
            InventoryMovement(
                product_id=product.id,
                movement_type=InventoryMovementType.adjustment_out,
                quantity=product.current_stock,
                note="Permanent stock-only removal",
            )
        )
    product.current_stock = 0
    product.status = ProductStatus.sold_gone_from_store


def _recalculate_sales_after_purge(db: Session, sale_ids: set[int]) -> None:
    for sale_id in sale_ids:
        sale = db.get(Sale, sale_id)
        if sale is None:
            continue
        remaining_items = db.query(SaleItem).filter(SaleItem.sale_id == sale_id).all()
        if not remaining_items:
            db.query(InventoryMovement).filter(
                InventoryMovement.reference_type == "sale",
                InventoryMovement.reference_id == sale_id,
            ).delete(synchronize_session=False)
            db.delete(sale)
            continue

        subtotal = sum((item.line_total for item in remaining_items), ZERO)
        profit = sum((item.line_profit for item in remaining_items), ZERO)
        discount = min(sale.discount, subtotal)
        total = max(subtotal - discount + sale.tax, ZERO)
        sale.subtotal = subtotal
        sale.discount = discount
        sale.total = total
        sale.payment_amount = min(sale.payment_amount, total)
        sale.profit_amount = profit - discount
        sale.payment_status = _payment_status(total, sale.payment_amount)


def _recalculate_purchases_after_purge(db: Session, purchase_ids: set[int]) -> None:
    for purchase_id in purchase_ids:
        purchase = db.get(Purchase, purchase_id)
        if purchase is None:
            continue
        old_due = max(purchase.total - purchase.payment_amount, ZERO)
        remaining_items = db.query(PurchaseItem).filter(PurchaseItem.purchase_id == purchase_id).all()
        if not remaining_items:
            if purchase.supplier:
                purchase.supplier.outstanding_amount = max(purchase.supplier.outstanding_amount - old_due, ZERO)
            db.query(InventoryMovement).filter(
                InventoryMovement.reference_type == "purchase",
                InventoryMovement.reference_id == purchase_id,
            ).delete(synchronize_session=False)
            db.delete(purchase)
            continue

        subtotal = sum((item.line_total for item in remaining_items), ZERO)
        total = subtotal + purchase.tax
        purchase.subtotal = subtotal
        purchase.total = total
        purchase.payment_amount = min(purchase.payment_amount, total)
        new_due = max(purchase.total - purchase.payment_amount, ZERO)
        if purchase.supplier:
            purchase.supplier.outstanding_amount = max(purchase.supplier.outstanding_amount - old_due + new_due, ZERO)


def _purge_product_and_financial_history(db: Session, product: Product) -> dict[str, int]:
    sale_ids = {row[0] for row in db.query(SaleItem.sale_id).filter(SaleItem.product_id == product.id).all()}
    purchase_ids = {row[0] for row in db.query(PurchaseItem.purchase_id).filter(PurchaseItem.product_id == product.id).all()}

    movements_removed = db.query(InventoryMovement).filter(InventoryMovement.product_id == product.id).delete(synchronize_session=False)
    sale_items_removed = db.query(SaleItem).filter(SaleItem.product_id == product.id).delete(synchronize_session=False)
    purchase_items_removed = db.query(PurchaseItem).filter(PurchaseItem.product_id == product.id).delete(synchronize_session=False)
    db.flush()

    _recalculate_sales_after_purge(db, sale_ids)
    _recalculate_purchases_after_purge(db, purchase_ids)
    db.delete(product)
    db.flush()

    # Never acknowledge a purge while any product-linked database row survives.
    remaining = (
        db.query(Product).filter(Product.id == product.id).count()
        + db.query(InventoryMovement).filter(InventoryMovement.product_id == product.id).count()
        + db.query(SaleItem).filter(SaleItem.product_id == product.id).count()
        + db.query(PurchaseItem).filter(PurchaseItem.product_id == product.id).count()
    )
    if remaining:
        raise RuntimeError(f"Product {product.id} purge verification failed")

    return {
        "inventory_movements_removed": movements_removed,
        "sale_items_removed": sale_items_removed,
        "purchase_items_removed": purchase_items_removed,
    }


def delete_product(db: Session, product_id: int, mode: ProductDeleteMode = "stock_only") -> dict[str, int] | None:
    product = db.get(Product, product_id, with_for_update=True)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if mode == "stock_only":
        _remove_current_stock_only(db, product)
        result = None
    elif mode == "purge_all":
        result = _purge_product_and_financial_history(db, product)
    else:
        raise HTTPException(status_code=400, detail="Invalid delete mode")

    db.commit()
    return result
