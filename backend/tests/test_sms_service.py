from app.core.config import Settings
from app.services.sms_service import send_sms


def test_console_provider_prints_whatsapp_bill(capsys):
    result = send_sms(Settings(sms_provider="console"), "919999999999", "Test bill")

    captured = capsys.readouterr()
    assert result.sent is True
    assert result.provider == "console"
    assert result.whatsapp_url == "https://wa.me/919999999999?text=Test%20bill"
    assert "WhatsApp bill to 919999999999" in captured.out


def test_whatsapp_provider_returns_free_send_link():
    result = send_sms(Settings(sms_provider="whatsapp"), "9999999999", "Customer invoice")

    assert result.sent is False
    assert result.provider == "whatsapp"
    assert result.whatsapp_url == "https://wa.me/919999999999?text=Customer%20invoice"
    assert result.sms_url == "sms:9999999999?body=Customer%20invoice"
    assert result.error == "Open WhatsApp to send this bill for free."


def test_missing_phone_returns_error():
    result = send_sms(Settings(sms_provider="whatsapp"), None, "Test")

    assert result.sent is False
    assert result.provider == "whatsapp"
    assert result.error == "Recipient mobile number is missing"