from decimal import Decimal
from urllib.parse import quote

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.schemas.bill_share import PurchaseSmsBill, SaleSmsBills, SmsBillMessage


def _money(value: Decimal) -> str:
    return f"Rs {value:,.2f}"


def _phone_digits(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(character for character in phone if character.isdigit())
    return digits or None


def _sms_url(phone: str | None, message: str) -> str | None:
    digits = _phone_digits(phone)
    if not digits:
        return None
    return f"sms:{digits}?body={quote(message)}"


def _whatsapp_phone(phone: str | None) -> str | None:
    digits = _phone_digits(phone)
    if not digits:
        return None
    if len(digits) == 10:
        return f"91{digits}"
    return digits


def _whatsapp_url(phone: str | None, message: str) -> str | None:
    digits = _whatsapp_phone(phone)
    if not digits:
        return None
    return f"https://wa.me/{digits}?text={quote(message)}"


def _bill_date_label(value) -> str:
    return value.strftime("%d %b %Y")


def _message(label: str, recipient_name: str, phone: str | None, body: str) -> SmsBillMessage:
    digits = _phone_digits(phone)
    return SmsBillMessage(
        label=label,
        recipient_name=recipient_name,
        phone=digits,
        message=body,
        sms_url=_sms_url(phone, body),
        whatsapp_url=_whatsapp_url(phone, body),
        sent=False,
        sms_provider="whatsapp",
        provider_message_id=None,
        send_error="Open WhatsApp to send this bill for free.",
    )


def sale_sms_bills(db: Session, sale_id: int) -> SaleSmsBills:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    customer = sale.customer
    customer_name = customer.name if customer else "Walk-in Customer"
    customer_phone = customer.phone if customer else None
    due = max(sale.total - sale.payment_amount, Decimal("0"))
    settings = get_settings()

    customer_lines = [
        "AI Showroom OS",
        "Customer Invoice",
        f"Invoice: {sale.invoice_number}",
        f"Date: {_bill_date_label(sale.bill_date)}",
        f"Customer: {customer_name}",
        "",
        "Items:",
    ]
    for index, item in enumerate(sale.items, start=1):
        customer_lines.append(
            f"{index}. {item.product.name} ({item.product.brand}) x {item.quantity} @ {_money(item.unit_selling_price)} = {_money(item.line_total)}"
        )
    customer_lines.extend([
        "",
        f"Subtotal: {_money(sale.subtotal)}",
        f"Discount: {_money(sale.discount)}",
        f"Tax: {_money(sale.tax)}",
        f"Total: {_money(sale.total)}",
        f"Paid: {_money(sale.payment_amount)}",
        f"Due: {_money(due)}",
        "",
        "Thank you for shopping with us.",
    ])

    owner_lines = [
        "AI Showroom OS",
        "Owner Sale Report",
        f"Invoice: {sale.invoice_number}",
        f"Date: {_bill_date_label(sale.bill_date)}",
        f"Customer: {customer_name}",
        f"Phone: {customer_phone or 'Not provided'}",
        "",
        "Complete item details:",
    ]
    for index, item in enumerate(sale.items, start=1):
        owner_lines.append(
            f"{index}. {item.product.name} ({item.product.brand}) | Qty {item.quantity} | Cost {_money(item.unit_purchase_price)} | Sold {_money(item.unit_selling_price)} | Revenue {_money(item.line_total)} | Profit {_money(item.line_profit)}"
        )
    owner_lines.extend([
        "",
        f"Subtotal: {_money(sale.subtotal)}",
        f"Discount: {_money(sale.discount)}",
        f"Tax: {_money(sale.tax)}",
        f"Total revenue: {_money(sale.total)}",
        f"Payment received: {_money(sale.payment_amount)}",
        f"Pending amount: {_money(due)}",
        f"Profit after discount: {_money(sale.profit_amount)}",
        f"Payment status: {sale.payment_status.value}",
    ])

    return SaleSmsBills(
        customer_bill=_message("Customer bill", customer_name, customer_phone, "\n".join(customer_lines)),
        owner_bill=_message("Owner sale report", "Owner", settings.owner_mobile_number, "\n".join(owner_lines)),
    )


def purchase_sms_bill(db: Session, purchase_id: int) -> PurchaseSmsBill:
    purchase = db.get(Purchase, purchase_id)
    if purchase is None:
        raise HTTPException(status_code=404, detail="Purchase not found")

    supplier_name = purchase.supplier.name if purchase.supplier else "Supplier"
    due = max(purchase.total - purchase.payment_amount, Decimal("0"))
    settings = get_settings()
    lines = [
        "AI Showroom OS",
        "Owner Purchase Report",
        f"Supplier invoice: {purchase.invoice_number}",
        f"Date: {_bill_date_label(purchase.bill_date)}",
        f"Supplier: {supplier_name}",
        "",
        "Purchased items:",
    ]
    for index, item in enumerate(purchase.items, start=1):
        lines.append(
            f"{index}. {item.product.name} ({item.product.brand}) | Qty {item.quantity} | Cost {_money(item.unit_cost)} | Line total {_money(item.line_total)}"
        )
    lines.extend([
        "",
        f"Subtotal: {_money(purchase.subtotal)}",
        f"Tax: {_money(purchase.tax)}",
        f"Total purchase: {_money(purchase.total)}",
        f"Paid: {_money(purchase.payment_amount)}",
        f"Outstanding: {_money(due)}",
    ])

    return PurchaseSmsBill(
        owner_bill=_message("Owner purchase report", "Owner", settings.owner_mobile_number, "\n".join(lines))
    )
