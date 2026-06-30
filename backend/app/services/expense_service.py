from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate


def create_expense(db: Session, payload: ExpenseCreate) -> Expense:
    expense = Expense(category=payload.category, amount=payload.amount, expense_date=payload.expense_date, note=payload.note)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def list_expenses(db: Session) -> list[Expense]:
    return db.query(Expense).order_by(Expense.expense_date.desc()).all()
