from pydantic import BaseModel


class SmsBillMessage(BaseModel):
    label: str
    recipient_name: str
    phone: str | None
    message: str
    sms_url: str | None
    whatsapp_url: str | None = None
    sent: bool = False
    sms_provider: str = "whatsapp"
    provider_message_id: str | None = None
    send_error: str | None = None


class SaleSmsBills(BaseModel):
    customer_bill: SmsBillMessage
    owner_bill: SmsBillMessage


class PurchaseSmsBill(BaseModel):
    owner_bill: SmsBillMessage
