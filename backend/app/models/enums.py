import enum


class UserRole(str, enum.Enum):
    owner = "owner"
    salesman = "salesman"


class ProductStatus(str, enum.Enum):
    in_stock = "in_stock"
    reserved = "reserved"
    sold_gone_from_store = "sold_gone_from_store"


class InventoryMovementType(str, enum.Enum):
    purchase_in = "purchase_in"
    sale_out = "sale_out"
    adjustment_in = "adjustment_in"
    adjustment_out = "adjustment_out"
    return_in = "return_in"


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"


class ExpenseCategory(str, enum.Enum):
    rent = "rent"
    electricity = "electricity"
    salary = "salary"
    transport = "transport"
    miscellaneous = "miscellaneous"
