from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus
from app.schemas.common import StrictRequestModel


class SaleItemCreate(StrictRequestModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=1_000_000)
    unit_selling_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    discount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)


class SaleCreate(StrictRequestModel):
    bill_date: date
    customer_name: str = Field(min_length=1, max_length=160)
    customer_phone: str | None = Field(default=None, min_length=7, max_length=24, pattern=r"^[0-9+() -]+$")
    customer_address: str | None = Field(default=None, max_length=500)
    discount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    tax: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    payment_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    items: list[SaleItemCreate] = Field(min_length=1, max_length=200)


class SalePaymentUpdate(StrictRequestModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class SaleRead(BaseModel):
    id: int
    invoice_number: str
    bill_date: date
    customer_name: str
    customer_phone: str | None
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    payment_amount: Decimal
    payment_status: PaymentStatus
    profit_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
