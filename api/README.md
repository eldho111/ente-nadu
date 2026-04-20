# API Service

FastAPI backend for civic report ingestion, geo routing, escalation payload generation, and moderation.

## Run (local)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## DB Init

```bash
python -m app.db.init_db
```

## Key Endpoints

- `POST /v1/reports/classify-preview`
- `POST /v1/media/upload-url`
- `POST /v1/reports`
- `GET /v1/reports`
- `GET /v1/reports/{id|public_id}`
- `POST /v1/reports/{id|public_id}/flags`
- `POST /v1/reports/{id|public_id}/notify/email`
- `POST /v1/reports/{id|public_id}/notify/whatsapp`