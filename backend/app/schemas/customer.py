from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import StrictRequestModel


class CustomerCreate(StrictRequestModel):
    name: str = Field(min_length=1, max_length=160)
    phone: str | None = Field(default=None, min_length=7, max_length=24, pattern=r"^[0-9+() -]+$")
    address: str | None = Field(default=None, max_length=500)


class CustomerRead(BaseModel):
    id: int
    name: str
    phone: str | None
    address: str | None
    total_spending: Decimal = Decimal("0")

    model_config = {"from_attributes": True}
