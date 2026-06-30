from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.sale import Sale
from app.schemas.customer import CustomerCreate


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    customer = Customer(name=payload.name, phone=payload.phone, address=payload.address)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def get_or_create_customer(db: Session, name: str, phone: str | None = None, address: str | None = None) -> Customer:
    query = db.query(Customer).filter(Customer.name == name)
    if phone:
        query = query.filter(Customer.phone == phone)
    customer = query.first()
    if customer:
        return customer
    customer = Customer(name=name, phone=phone, address=address)
    db.add(customer)
    db.flush()
    return customer


def list_customers_with_spending(db: Session) -> list[dict]:
    rows = (
        db.query(Customer, func.coalesce(func.sum(Sale.total), 0).label("total_spending"))
        .outerjoin(Sale, Sale.customer_id == Customer.id)
        .group_by(Customer.id)
        .order_by(Customer.name)
        .all()
    )
    return [{"id": c.id, "name": c.name, "phone": c.phone, "address": c.address, "total_spending": Decimal(total)} for c, total in rows]
