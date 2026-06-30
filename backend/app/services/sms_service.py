from dataclasses import dataclass
from urllib.parse import quote

from app.core.config import Settings


@dataclass(frozen=True)
class SmsSendResult:
    sent: bool
    provider: str
    provider_message_id: str | None = None
    error: str | None = None
    whatsapp_url: str | None = None
    sms_url: str | None = None


def _phone_digits(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(character for character in phone if character.isdigit())
    return digits or None


def _whatsapp_phone(phone: str | None) -> str | None:
    digits = _phone_digits(phone)
    if not digits:
        return None
    if len(digits) == 10:
        return f"91{digits}"
    return digits


def _sms_url(phone: str | None, message: str) -> str | None:
    digits = _phone_digits(phone)
    if not digits:
        return None
    return f"sms:{digits}?body={quote(message)}"


def _whatsapp_url(phone: str | None, message: str) -> str | None:
    digits = _whatsapp_phone(phone)
    if not digits:
        return None
    return f"https://wa.me/{digits}?text={quote(message)}"


def send_sms(settings: Settings, phone: str | None, message: str) -> SmsSendResult:
    """Compatibility wrapper for bill messages.

    The app does not send paid SMS from the backend. It generates WhatsApp links
    so the owner/customer can review the bill and press Send in WhatsApp.
    """
    if not phone:
        return SmsSendResult(sent=False, provider=settings.sms_provider, error="Recipient mobile number is missing")

    if settings.sms_provider == "console":
        print(f"WhatsApp bill to {phone}:\n{message}")
        return SmsSendResult(
            sent=True,
            provider="console",
            whatsapp_url=_whatsapp_url(phone, message),
            sms_url=_sms_url(phone, message),
        )

    return SmsSendResult(
        sent=False,
        provider="whatsapp",
        error="Open WhatsApp to send this bill for free.",
        whatsapp_url=_whatsapp_url(phone, message),
        sms_url=_sms_url(phone, message),
    )