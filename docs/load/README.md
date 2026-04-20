# Load Testing (k6)

## Prerequisites

- Production stack running:
  - `docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build`
- `k6` installed on the load generator host.

## Read-heavy profile (1k concurrent simulation)

```bash
k6 run docs/load/k6-read-heavy.js -e BASE_URL=http://localhost -e VUS=1000 -e DURATION=5m
```

## Mixed traffic profile

Read-heavy with moderate write + classify-preview requests:

```bash
k6 run docs/load/k6-mixed.js -e BASE_URL=http://localhost -e RATE=120 -e DURATION=5m -e PRE_VUS=250 -e MAX_VUS=1200
```

## What to watch during test

- API latency and 5xx rate.
- Queue depth:
  - `./infra/check-queue.ps1 -ComposeFile infra/docker-compose.prod.yml -EnvFile .env`
- DB CPU/IO and connections.
- Redis memory and latency.
- MinIO disk growth.

## Pass/Fail quick guide

- Pass:
  - No sustained 5xx spikes.
  - Classify queue backlog drains continuously.
  - API p95 and classify-preview p95 remain within target.
- Fail:
  - Queue lag grows without recovery.
  - DB saturation (high wait, high CPU, or connection exhaustion).
  - Repeated worker crashes or timeout storms.
