from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import ExpenseCategory
from app.schemas.common import StrictRequestModel


class ExpenseCreate(StrictRequestModel):
    category: ExpenseCategory
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    expense_date: date
    note: str | None = Field(default=None, max_length=1000)


class ExpenseRead(BaseModel):
    id: int
    category: ExpenseCategory
    amount: Decimal
    expense_date: date
    note: str | None

    model_config = {"from_attributes": True}
