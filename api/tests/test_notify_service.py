from types import SimpleNamespace

from app.services.notify_service import build_whatsapp_payload


def test_whatsapp_payload_contains_share_url() -> None:
    report = SimpleNamespace(
        category_final=SimpleNamespace(value="pothole"),
        description_ai="Large pothole near junction",
        description_user=None,
        public_id="RPT-ABC123",
    )

    payload = build_whatsapp_payload(report, "https://example.com/reports/RPT-ABC123")
    assert "RPT-ABC123" in payload["message"]
    assert "wa.me" in payload["deep_link"]