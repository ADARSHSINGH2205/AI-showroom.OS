from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.catalog import Product
from app.models.enums import InventoryMovementType, ProductStatus
from app.models.inventory import InventoryMovement
from app.schemas.inventory import InventoryMovementCreate


def apply_stock_movement(db: Session, payload: InventoryMovementCreate) -> InventoryMovement:
    product = db.get(Product, payload.product_id, with_for_update=True)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    signed_quantity = payload.quantity
    if payload.movement_type in {InventoryMovementType.sale_out, InventoryMovementType.adjustment_out}:
        signed_quantity = -payload.quantity

    if product.current_stock + signed_quantity < 0:
        raise HTTPException(status_code=400, detail="Stock cannot go below zero")

    product.current_stock += signed_quantity
    product.status = ProductStatus.in_stock if product.current_stock > 0 else ProductStatus.sold_gone_from_store
    movement = InventoryMovement(
        product_id=product.id,
        movement_type=payload.movement_type,
        quantity=payload.quantity,
        note=payload.note,
        transaction_date=payload.transaction_date,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
