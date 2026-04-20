from app.services.id_service import generate_public_id, generate_token_number


def test_generate_public_id_shape() -> None:
    value = generate_public_id()
    assert value.startswith("RPT-")
    assert len(value) == 14


def test_generate_token_number_shape() -> None:
    value = generate_token_number()
    assert value.startswith("CP-")
    assert len(value) == 18
