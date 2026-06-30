from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.sale import Sale
from app.models.user import User
from app.schemas.bill_share import SaleSmsBills
from app.schemas.sale import SaleCreate, SalePaymentUpdate, SaleRead
from app.services.bill_share_service import sale_sms_bills
from app.services.sale_service import create_sale, list_due_sales, record_sale_payment

router = APIRouter()


@router.get("", response_model=list[SaleRead])
def read_sales(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return db.query(Sale).order_by(Sale.bill_date.desc(), Sale.created_at.desc()).all()


@router.get("/due", response_model=list[SaleRead])
def read_due_sales(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return list_due_sales(db)


@router.post("", response_model=SaleRead, status_code=201)
def create_sale_endpoint(payload: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return create_sale(db, payload, current_user)


@router.post("/{sale_id}/payments", response_model=SaleRead)
def record_sale_payment_endpoint(sale_id: int, payload: SalePaymentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return record_sale_payment(db, sale_id, payload.amount)


@router.get("/{sale_id}/sms-bills", response_model=SaleSmsBills)
def sale_sms_bills_endpoint(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return sale_sms_bills(db, sale_id)
