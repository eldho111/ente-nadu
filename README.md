# Civic Pulse Monorepo

Citizen reporting platform with AI triage, public accountability surfaces, and official action inbox.

## Repositories

- `mobile/` Flutter client.
- `api/` FastAPI API.
- `worker/` Redis RQ workers.
- `web/` Next.js public + app-shell UI (installable PWA).
- `infra/` Compose stacks and operational scripts.
- `docs/` contracts, architecture, runbook, and load testing.

## Local Quick Start (Default: Stable Full Stack)

1. Copy env file:

```bash
cp .env.example .env
```

2. Start the full stack in stable local mode (prod-like runtime):

```powershell
.\start-full.ps1 -Rebuild
```

Alternative one-by-one root-cause-first runbook automation:

```powershell
.\run-local-stable.ps1
```

Use `-SkipWebRebuild` only when the web image is already fresh.

If local setup is unstable, use one-command recovery:

```powershell
.\recover-local.ps1
```

Optional auto-open browser after recovery:

```powershell
.\recover-local.ps1 -OpenBrowser
```

3. Initialize database:

```bash
docker compose -f infra/docker-compose.local-stable.yml --env-file .env exec api python -m app.db.init_db
```

4. Open:

- Web: `http://localhost:3000`
- App shell: `http://localhost:3000/app`
- API docs: `http://localhost:8000/docs`
- Ops inbox: `http://localhost:3000/ops`

## Startup Modes

### Full stack (recommended)

```powershell
.\start-full.ps1 -Rebuild
```

By default, this script now cleans conflicting compose profiles first (`docker-compose.yml` and `docker-compose.local-stable.yml`) to avoid mixed-stack issues.

Use `-Dev` for hot-reload development compose:

```powershell
.\start-full.ps1 -Dev -Rebuild
```

Use `-NoProfileCleanup` only if you explicitly want to keep existing profile state.

### UI-only debug

```powershell
.\start-ui.ps1 -Rebuild
```

This mode starts only `web` and is intended for UI iteration. Classify, notify, and worker-backed flows are not guaranteed.

### Production profile

```powershell
.\start-prod.ps1 -Rebuild
```

## Antigravity / Preview Canonical Command

Use this command from repo root to ensure Next.js starts with the correct working directory:

```bash
npm run preview:web
```

## Production Compose Profile

- Uses Gunicorn for API and `next start` for web.
- Includes Caddy reverse proxy.
- Includes worker pool (`worker-scheduler`, `worker-a`, `worker-b`).

Run:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

Check:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
./infra/check-queue.ps1 -ComposeFile infra/docker-compose.prod.yml -EnvFile .env
```

## UI Render Recovery

If the UI gets stuck with Next.js chunk/module errors, run:

```powershell
.\repair-web.ps1
```

Use `-Dev` if you are running the hot-reload compose stack.

Avoid mixing `next build` and `next dev` in the same long-running container session. Use stable mode for build/start and dev mode for hot reload.

PWA/service worker is disabled by default in local compose to prevent stale-cache white screens. It remains enabled in production profile.

If browser cache is stuck, open:

`http://127.0.0.1:3000/clear-cache`

For automatic diagnosis, run:

```powershell
npm run diagnose:ui
```

Direct script usage (works even if Node/npm is unavailable):

```powershell
powershell -ExecutionPolicy Bypass -File .\diagnose-ui.ps1 -ComposeFile infra\docker-compose.local-stable.yml
```

Browser-side diagnostic page:

`http://127.0.0.1:3000/doctor`

Runtime/browser crash doctor:

`http://127.0.0.1:3000/doctor/runtime`

Ultra-minimal browser probe (no React/JS dependencies):

`http://127.0.0.1:3000/plain.html`

Safe launch mode (map disabled for triage):

`http://127.0.0.1:3000/app?safe=1`

By default, `http://127.0.0.1:3000/app` now opens in safe mode. Use `?safe=0` to explicitly try full map rendering.

Static render sanity page (bypasses React app):

`http://127.0.0.1:3000/diag.html`

One-command evidence collector:

```powershell
powershell -ExecutionPolicy Bypass -File .\collect-ui-evidence.ps1
```

This writes `ui-evidence.json` with compose status, web logs tail, endpoint checks, app asset reachability, and runtime meta.

## Root Cause Checklist

1. Confirm daemon + memory:

```powershell
docker info
```

If Docker VM memory is below 6 GiB, increase WSL2 memory and restart Docker Desktop.

2. Confirm one active profile only:

```powershell
docker compose -f infra/docker-compose.yml --env-file .env down --remove-orphans
docker compose -f infra/docker-compose.local-stable.yml --env-file .env down --remove-orphans
```

3. Rebuild only when needed:

```powershell
docker compose -f infra/docker-compose.local-stable.yml --env-file .env build --no-cache web
```

If web logs show `Could not find a production build in the '.next-*' directory`, rebuild the web image immediately.

4. Validate endpoints in order:

`/diag.html` -> `/doctor/runtime` -> `/app?safe=1` -> `/app` -> `/health`

## API Meta Endpoints

- `GET /v1/meta/locales`
- `GET /v1/meta/branding`
- `GET /v1/meta/runtime`

## Load Testing

See `docs/load/README.md` for k6 profiles:

- `docs/load/k6-read-heavy.js` (1k concurrent read-heavy).
- `docs/load/k6-mixed.js` (mixed read/write/classify-preview).

Capacity sizing guidance is in `docs/capacity-plan.md`.

## Notes

- Brand identity is `Civic Pulse`.
- Region/city labels are runtime-configurable via `REGION_LABEL`.
- Public coordinates are jittered and media is public-safe only.
