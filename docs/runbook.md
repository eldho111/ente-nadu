# Civic Pulse Operations Runbook

## Environments

- `dev`: `infra/docker-compose.yml`
- `local-stable`: `infra/docker-compose.local-stable.yml`
- `prod (single VM)`: `infra/docker-compose.prod.yml`

## Start and Stop

### Local Stable (Recommended)

```bash
./start-full.ps1 -Rebuild
```

```bash
./start-full.ps1 -Stop
```

Direct compose equivalent:

```bash
docker compose -f infra/docker-compose.local-stable.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.local-stable.yml --env-file .env ps
```

### Development Hot-Reload

```bash
./start-full.ps1 -Dev -Rebuild
```

```bash
./start-full.ps1 -Dev -Stop
```

### Production Profile

```bash
./start-prod.ps1 -Rebuild
```

```bash
./start-prod.ps1 -Stop
```

Direct compose equivalent:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
```

## Health Checks

- Proxy: `http://localhost`
- API: `http://localhost:8000/health`
- Web app shell: `http://localhost:3000/app`
- Branding meta: `http://localhost:8000/v1/meta/branding`
- Queue depth: `./infra/check-queue.ps1`

## Logs

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env logs -f caddy api web
docker compose -f infra/docker-compose.prod.yml --env-file .env logs -f worker-scheduler worker-a worker-b
```

Local stable:

```bash
docker compose -f infra/docker-compose.local-stable.yml --env-file .env logs -f api web worker
```

## Scaling Actions (Single VM)

Increase API workers:

- Set `GUNICORN_WORKERS` in `.env` (start with `4`, then `6`, then `8` based on CPU headroom).
- Restart `api` service.

Increase worker throughput:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --scale worker-a=2 --scale worker-b=2
```

Keep exactly one scheduler-enabled worker (`worker-scheduler`).

## SLO Guardrails (Pilot)

- API `p95` < 800 ms on read paths.
- `POST /v1/reports/classify-preview p95` < 2.5 s.
- Queue lag (classification) steady-state < 5 minutes.
- Error rate < 1%.

## Dependency Degradation Behavior

- Reverse geocode uses Redis cache and a circuit breaker.
- Classify preview uses timeout + circuit breaker fallback.
- Report create path still accepts reports when async classification enqueue fails.

## UI Render Incident Playbook

### Symptom map

- `Missing required html tags (<html>, <body>)`: preview tooling likely started Next from the wrong directory (`web/app` instead of `web`).
- `Cannot find module './xxx.js'` from `.next/server/*`: stale/corrupted Next build artifacts in dev runtime.
- Blank map with working shell chrome: API not reachable or `/v1/reports` returning empty/unhealthy response.
- Frequent random 500s after mode changes: mixed `next build` and `next dev` artifacts in one runtime.

Decision branch:

- `ERR_EMPTY_RESPONSE` or connection closed: container/runtime branch (`docker compose ps`, `web` logs, memory/restart checks).
- `/app` is 200 but white page: browser/runtime branch (`/doctor/runtime`, `/app?safe=1`, reset browser state).
- Header visible but map area empty: map/WebGL branch (safe mode should render list; if yes, map init is failing).

### Diagnosis commands

```bash
docker compose -f infra/docker-compose.local-stable.yml --env-file .env ps
docker compose -f infra/docker-compose.local-stable.yml --env-file .env logs web --tail 120
docker compose -f infra/docker-compose.local-stable.yml --env-file .env logs api --tail 120
```

```bash
curl http://localhost:3000/app
curl "http://localhost:3000/app?safe=1"
curl http://localhost:3000/doctor/runtime
curl http://localhost:3000/plain.html
curl http://localhost:8000/health
curl http://localhost:8000/v1/reports
```

```powershell
.\collect-ui-evidence.ps1
```

### Recovery command

```powershell
.\repair-web.ps1
```

For hot-reload compose, use:

```powershell
.\repair-web.ps1 -Dev
```

Do not run `next build` inside the dev hot-reload service while it is serving traffic.

If `/app` is white but `/diag.html` is fine, use `http://localhost:3000/app?safe=1` first. If safe mode renders, the failure is in browser-side heavy components (typically map or stale browser runtime state).

### Canonical Antigravity preview command

```bash
npm run preview:web
```

## Backups and Recovery

Create backup:

```bash
./infra/backup-db.sh
```

Restore test checklist:

1. Restore DB dump into a staging Postgres instance.
2. Verify `reports`, `media`, `report_events`, `notification_deliveries` counts.
3. Start API against restored DB and validate `/health`, `/v1/reports`, `/v1/reports/{id}`.

## Moderation SLA

- Review flagged content within 24h.
- Hide content immediately if personal data is exposed.
