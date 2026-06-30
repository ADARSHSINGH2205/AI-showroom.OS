from app.core.config import Settings
from app.services.sms_service import send_sms


def test_console_sms_provider_prints_message(capsys):
    result = send_sms(Settings(sms_provider="console"), "919999999999", "Test bill")

    captured = capsys.readouterr()
    assert result.sent is True
    assert result.provider == "console"
    assert "SMS to 919999999999" in captured.out
    assert "Test bill" in captured.out


def test_textbelt_provider_sends_with_expected_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        def json(self):
            return {"success": True, "textId": "TB123"}

    def fake_post(url, data, timeout):
        captured["url"] = url
        captured["data"] = data
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.services.sms_service.requests.post", fake_post)

    result = send_sms(
        Settings(sms_provider="textbelt", textbelt_api_key="textbelt"),
        "9999999999",
        "Customer invoice",
    )

    assert result.sent is True
    assert result.provider == "textbelt"
    assert result.provider_message_id == "TB123"
    assert captured == {
        "url": "https://textbelt.com/text",
        "data": {"phone": "+919999999999", "message": "Customer invoice", "key": "textbelt"},
        "timeout": 15,
    }


def test_textbelt_provider_returns_provider_error(monkeypatch):
    class FakeResponse:
        def json(self):
            return {"success": False, "error": "quota exceeded"}

    monkeypatch.setattr("app.services.sms_service.requests.post", lambda url, data, timeout: FakeResponse())

    result = send_sms(Settings(sms_provider="textbelt", textbelt_api_key="textbelt"), "9999999999", "Test")

    assert result.sent is False
    assert result.provider == "textbelt"
    assert result.error == "quota exceeded"


def test_auto_provider_reports_all_failures(monkeypatch):
    class FakeResponse:
        def json(self):
            return {"success": False, "error": "country disabled"}

    monkeypatch.setattr("app.services.sms_service.requests.post", lambda url, data, timeout: FakeResponse())

    result = send_sms(
        Settings(
            sms_provider="auto",
            textbelt_api_key="textbelt",
        ),
        "9999999999",
        "Test",
    )

    assert result.sent is False
    assert result.provider == "auto"
    assert result.error == "textbelt: country disabled"
