# Architecture Overview

## Services

- `mobile` (Flutter): camera capture, location, AI preview confirm, submit, offline queue.
- `web` (Next.js): public map/share pages plus mobile-first `/app` shell and PWA install flow.
- `api` (FastAPI): report APIs, geo routing, moderation, notify payload generation, ops APIs.
- `worker` (RQ): AI enrichment, media processing, dedupe foundations, notification fanout.
- `infra` (Compose): PostGIS, Redis, MinIO, API, worker pool, web, and Caddy proxy for prod.

## Data Flow

1. Client requests upload URL from API.
2. Client uploads media directly to MinIO.
3. Client submits report with location, category, media keys.
4. API writes report, timeline events, subscriptions; enqueues classification.
5. Worker enriches AI fields and executes async delivery tasks.
6. Web surfaces public-safe report data (blurred media + jittered coordinates).

## Privacy Defaults

- Public coordinates are jittered by 75 meters.
- Exact coordinates are stored only internally.
- Public pages serve blurred media only.
- Publish-first moderation with flag queue.

## Production Runtime (Single VM)

- API: Gunicorn + Uvicorn workers.
- Web: `next build` + `next start`.
- Reverse proxy: Caddy for `/v1/*` -> API and other routes -> web.
- Worker topology: one scheduler-enabled worker + additional workers for throughput.
- Caching/resilience:
  - Reverse geocode cache in Redis.
  - AI/geocode timeout and circuit-breaker fallback.
