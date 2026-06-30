from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.inventory import InventoryMovement
from app.models.user import User
from app.schemas.inventory import InventoryMovementCreate, InventoryMovementRead
from app.services.inventory_service import apply_stock_movement

router = APIRouter()


@router.get("/movements", response_model=list[InventoryMovementRead])
def read_movements(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return db.query(InventoryMovement).order_by(InventoryMovement.transaction_date.desc(), InventoryMovement.created_at.desc()).limit(100).all()


@router.post("/movements", response_model=InventoryMovementRead, status_code=201)
def create_movement(payload: InventoryMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return apply_stock_movement(db, payload)
