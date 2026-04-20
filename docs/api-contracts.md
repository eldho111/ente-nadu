# API Contracts (MVP + Ops Inbox)

Base path: `/v1`

## Citizen/Public Endpoints

- `POST /reports/classify-preview`
- `POST /media/upload-url`
- `POST /reports`
- `GET /reports`
- `GET /reports/metrics/wards`
- `GET /reports/{id|public_id}`
- `POST /reports/{id|public_id}/flags`
- `POST /reports/{id|public_id}/notify/email`
- `POST /reports/{id|public_id}/notify/whatsapp`
- `POST /reports/{id|public_id}/subscribe`
- `GET /notifications`
- `PATCH /notifications/{id}/read`
- `POST /reports/{id|public_id}/reopen-request`
- `GET /jurisdictions?state=&city=&type=`
- `GET /meta/locales`
- `GET /meta/branding`
- `POST /auth/otp/start`
- `POST /auth/otp/verify`

## Ops/Admin Endpoints

- `POST /ops/auth/login`
- `GET /ops/reports`
- `POST /ops/reports/{id}/claim`
- `PATCH /ops/reports/{id}/status`
- `POST /ops/reports/{id}/resolution-proof`
- `GET /ops/metrics`
- `PATCH /admin/reports/{id|public_id}/status`
- `PATCH /admin/reports/{id|public_id}/moderation`
- `POST /admin/wards/import`
- `POST /admin/routing-rules/upsert`

## Core Events

- `report.created`
- `report.classification.requested`
- `report.classified`
- `report.routed`
- `report.flagged`
- `report.status_changed`
- `report.moderation_changed`
- `report.assigned`
- `report.resolution_proof_added`
- `report.notification.subscribed`
- `report.notification.queued`
- `report.notification.sent`
- `report.reopen_requested`
