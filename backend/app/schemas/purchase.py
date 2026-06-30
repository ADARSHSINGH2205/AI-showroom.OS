from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import StrictRequestModel


class PurchaseItemCreate(StrictRequestModel):
    product_id: int | None = Field(default=None, gt=0)
    name: str | None = Field(default=None, max_length=180)
    category_name: str | None = Field(default=None, max_length=100)
    brand: str | None = Field(default=None, max_length=120)
    selling_price: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    quantity: int = Field(gt=0, le=1_000_000)
    unit_cost: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class PurchaseCreate(StrictRequestModel):
    bill_date: date
    supplier_name: str = Field(min_length=1, max_length=160)
    supplier_phone: str | None = Field(default=None, min_length=7, max_length=24, pattern=r"^[0-9+() -]+$")
    invoice_number: str = Field(min_length=1, max_length=100)
    tax: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    payment_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    items: list[PurchaseItemCreate] = Field(min_length=1, max_length=200)


class PurchasePaymentUpdate(StrictRequestModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class PurchaseRead(BaseModel):
    id: int
    invoice_number: str
    bill_date: date
    supplier_name: str
    supplier_phone: str | None
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    payment_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
