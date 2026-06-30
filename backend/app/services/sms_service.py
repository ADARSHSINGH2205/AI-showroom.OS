from dataclasses import dataclass

import requests

from app.core.config import Settings


TEXTBELT_URL = "https://textbelt.com/text"


@dataclass(frozen=True)
class SmsSendResult:
    sent: bool
    provider: str
    provider_message_id: str | None = None
    error: str | None = None


def _e164_number(phone: str) -> str:
    if phone.startswith("+"):
        return phone
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    return f"+{digits}"


def send_sms(settings: Settings, phone: str | None, message: str) -> SmsSendResult:
    if not phone:
        return SmsSendResult(sent=False, provider=settings.sms_provider, error="Recipient mobile number is missing")

    if settings.sms_provider == "auto":
        errors: list[str] = []
        if settings.textbelt_api_key:
            textbelt_result = _send_textbelt(settings, phone, message)
            if textbelt_result.sent:
                return textbelt_result
            errors.append(f"textbelt: {textbelt_result.error}")
        return SmsSendResult(sent=False, provider="auto", error="; ".join(errors) or "No SMS provider is configured")

    if settings.sms_provider == "console":
        print(f"SMS to {phone}:\n{message}")
        return SmsSendResult(sent=True, provider="console")

    if settings.sms_provider == "textbelt":
        return _send_textbelt(settings, phone, message)

    return SmsSendResult(sent=False, provider=settings.sms_provider, error="Unsupported SMS provider")


def _send_textbelt(settings: Settings, phone: str, message: str) -> SmsSendResult:
    if not settings.textbelt_api_key:
        return SmsSendResult(sent=False, provider="textbelt", error="Textbelt API key is not configured")

    try:
        response = requests.post(
            TEXTBELT_URL,
            data={"phone": _e164_number(phone), "message": message, "key": settings.textbelt_api_key},
            timeout=15,
        )
        data = response.json()
    except Exception as exc:
        return SmsSendResult(sent=False, provider="textbelt", error=str(exc))

    if not data.get("success"):
        error = data.get("error") or data.get("quotaRemaining") or "Textbelt rejected the message"
        return SmsSendResult(sent=False, provider="textbelt", error=str(error))

    text_id = data.get("textId")
    return SmsSendResult(sent=True, provider="textbelt", provider_message_id=str(text_id) if text_id else None)
