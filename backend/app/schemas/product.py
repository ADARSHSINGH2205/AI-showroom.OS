from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import ProductStatus
from app.schemas.common import StrictRequestModel


class CategoryRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class SupplierRead(BaseModel):
    id: int
    name: str
    phone: str | None = None
    address: str | None = None
    outstanding_amount: Decimal

    model_config = {"from_attributes": True}


class ProductCreate(StrictRequestModel):
    category_name: str = Field(min_length=1, max_length=100)
    supplier_name: str | None = Field(default=None, max_length=160)
    brand: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    purchase_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    selling_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    warranty_months: int = Field(default=0, ge=0, le=600)
    image_url: str | None = Field(default=None, max_length=2048)
    barcode: str | None = Field(default=None, max_length=100)
    minimum_stock: int = Field(default=0, ge=0, le=1_000_000)
    opening_stock: int = Field(default=0, ge=0, le=1_000_000)


class ProductRead(BaseModel):
    id: int
    category_id: int
    supplier_id: int | None
    brand: str
    name: str
    description: str | None
    purchase_price: Decimal
    selling_price: Decimal
    warranty_months: int
    image_url: str | None
    barcode: str | None
    current_stock: int
    minimum_stock: int
    status: ProductStatus

    model_config = {"from_attributes": True}
