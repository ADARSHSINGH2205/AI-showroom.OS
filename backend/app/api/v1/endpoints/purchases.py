from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.purchase import Purchase
from app.models.user import User
from app.schemas.bill_share import PurchaseSmsBill
from app.schemas.purchase import PurchaseCreate, PurchasePaymentUpdate, PurchaseRead
from app.services.bill_share_service import purchase_sms_bill
from app.services.purchase_service import create_purchase, list_due_purchases, record_purchase_payment

router = APIRouter()


@router.get("", response_model=list[PurchaseRead])
def read_purchases(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return db.query(Purchase).order_by(Purchase.bill_date.desc(), Purchase.created_at.desc()).all()


@router.post("", response_model=PurchaseRead, status_code=201)
def create_purchase_endpoint(payload: PurchaseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return create_purchase(db, payload, current_user)


@router.get("/due", response_model=list[PurchaseRead])
def read_due_purchases(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return list_due_purchases(db)


@router.post("/{purchase_id}/payments", response_model=PurchaseRead)
def record_purchase_payment_endpoint(purchase_id: int, payload: PurchasePaymentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return record_purchase_payment(db, purchase_id, payload.amount)


@router.get("/{purchase_id}/sms-bill", response_model=PurchaseSmsBill)
def purchase_sms_bill_endpoint(purchase_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return purchase_sms_bill(db, purchase_id)

