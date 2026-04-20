# Routing Matrix (Seed Template)

Populate rules using:

- `POST /v1/admin/routing-rules/upsert`

MVP routing keys:

- `jurisdiction_id` (preferred)
- `category`
- department target and recipient lists

Example rows:

| jurisdiction_id | category | department_name | email_to |
|---|---|---|---|
| `null` | pothole | BBMP Roads | roads@example.org |
| `null` | waterlogging | BWSSB Drainage | drainage@example.org |
| `null` | streetlight_outage | BESCOM | lights@example.org |
| `null` | traffic_hotspot | Traffic Police | traffic@example.org |

Priority order:

1. Exact `jurisdiction_id` + category.
2. Parent jurisdiction fallback + category.
3. Global category fallback.
