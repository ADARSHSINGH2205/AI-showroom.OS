from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import InventoryMovementType
from app.schemas.common import StrictRequestModel


class InventoryMovementCreate(StrictRequestModel):
    product_id: int = Field(gt=0)
    movement_type: InventoryMovementType = InventoryMovementType.purchase_in
    quantity: int = Field(gt=0, le=1_000_000)
    note: str | None = Field(default=None, max_length=1000)
    transaction_date: date = Field(default_factory=date.today)


class InventoryMovementRead(BaseModel):
    id: int
    product_id: int
    movement_type: InventoryMovementType
    quantity: int
    note: str | None
    transaction_date: date
    created_at: datetime

    model_config = {"from_attributes": True}
