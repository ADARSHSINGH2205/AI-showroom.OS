from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import StrictRequestModel


class AIQuestion(StrictRequestModel):
    question: str = Field(min_length=2, max_length=1000)


class AIAnswer(BaseModel):
    answer: str
    used_live_database_context: bool
    provider: str


class DetectedBillItem(BaseModel):
    product_id: int | None = None
    name: str
    category: str
    brand: str
    quantity: int
    unit_price: Decimal
    confidence: float


class BillDetection(BaseModel):
    bill_type: str
    party_name: str
    invoice_number: str
    bill_date: date | None
    confidence: float
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    warnings: list[str]
    items: list[DetectedBillItem]
    provider: str
