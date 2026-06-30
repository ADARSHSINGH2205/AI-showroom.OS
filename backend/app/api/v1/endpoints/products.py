from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.user import User
from app.schemas.product import ProductCreate, ProductRead
from app.services.catalog_service import create_product, delete_product, list_products

router = APIRouter()


@router.get("", response_model=list[ProductRead])
def read_products(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return list_products(db)


@router.post("", response_model=ProductRead, status_code=201)
def create_product_endpoint(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    return create_product(db, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_endpoint(
    product_id: int,
    mode: Literal["stock_only", "purge_all"] = Query("stock_only"),
    confirmation: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> Response:
    if mode == "purge_all" and confirmation != "PURGE":
        raise HTTPException(status_code=400, detail="Type PURGE to remove all product and financial history")
    delete_product(db, product_id, mode)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
