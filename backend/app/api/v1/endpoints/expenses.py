from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead
from app.services.expense_service import create_expense, list_expenses

router = APIRouter()


@router.get("", response_model=list[ExpenseRead])
def read_expenses(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return list_expenses(db)


@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense_endpoint(payload: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    return create_expense(db, payload)
