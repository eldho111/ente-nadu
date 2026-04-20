from app.services.location_service import apply_location_jitter


def test_apply_location_jitter_changes_point_in_small_range() -> None:
    lat, lon = 12.9716, 77.5946
    public_lat, public_lon = apply_location_jitter(lat, lon, meters=75)

    assert public_lat != lat or public_lon != lon
    assert abs(public_lat - lat) < 0.002
    assert abs(public_lon - lon) < 0.002