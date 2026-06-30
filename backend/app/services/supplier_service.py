from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.catalog import Product, Supplier
from app.models.enums import ProductStatus
from app.models.inventory import InventoryMovement
from app.models.purchase import Purchase
from app.schemas.supplier import SupplierCreate


def create_supplier(db: Session, payload: SupplierCreate) -> Supplier:
    supplier = Supplier(name=payload.name, phone=payload.phone, address=payload.address)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def list_suppliers(db: Session) -> list[Supplier]:
    return db.query(Supplier).order_by(Supplier.name).all()


def delete_supplier(
    db: Session,
    supplier_id: int,
    mode: str,
    date_from: date | None,
    date_to: date | None,
) -> dict:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if mode == "range" and (date_from is None or date_to is None):
        raise HTTPException(status_code=400, detail="Both from and to dates are required")
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="From date cannot be after to date")

    query = db.query(Purchase).filter(Purchase.supplier_id == supplier.id)
    if mode == "range":
        query = query.filter(Purchase.bill_date.between(date_from, date_to))
    elif mode != "all":
        raise HTTPException(status_code=400, detail="Invalid supplier deletion mode")

    purchases = query.all()
    removed_due = Decimal("0")
    for purchase in purchases:
        removed_due += max(purchase.total - purchase.payment_amount, Decimal("0"))
        for item in purchase.items:
            product = db.get(Product, item.product_id)
            if product is not None:
                product.current_stock = max(product.current_stock - item.quantity, 0)
                if product.current_stock == 0:
                    product.status = ProductStatus.sold_gone_from_store
        db.query(InventoryMovement).filter(
            InventoryMovement.reference_type == "purchase",
            InventoryMovement.reference_id == purchase.id,
        ).delete(synchronize_session=False)
        db.delete(purchase)

    supplier.outstanding_amount = max(supplier.outstanding_amount - removed_due, Decimal("0"))
    supplier_deleted = mode == "all"
    if supplier_deleted:
        db.query(Product).filter(Product.supplier_id == supplier.id).update({"supplier_id": None})
        db.delete(supplier)

    db.commit()
    return {
        "supplier_deleted": supplier_deleted,
        "purchases_removed": len(purchases),
        "message": "Supplier and all purchase history removed" if supplier_deleted else "Selected supplier purchase history removed",
    }
