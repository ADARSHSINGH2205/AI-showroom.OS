from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.user import User
from app.schemas.customer import CustomerCreate
from app.services.customer_service import create_customer, list_customers_with_spending

router = APIRouter()


@router.get("")
def read_customers(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return list_customers_with_spending(db)


@router.post("", status_code=201)
def create_customer_endpoint(payload: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return create_customer(db, payload)
