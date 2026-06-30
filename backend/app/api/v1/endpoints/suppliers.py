from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierRead
from app.services.supplier_service import create_supplier, delete_supplier, list_suppliers

router = APIRouter()


@router.get("", response_model=list[SupplierRead])
def read_suppliers(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return list_suppliers(db)


@router.post("", response_model=SupplierRead, status_code=201)
def create_supplier_endpoint(payload: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return create_supplier(db, payload)


@router.delete("/{supplier_id}")
def delete_supplier_endpoint(
    supplier_id: int,
    mode: Literal["range", "all"] = Query(...),
    confirmation: str = Query(...),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    if confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Type DELETE to confirm this strict action")
    return delete_supplier(db, supplier_id, mode, date_from, date_to)
