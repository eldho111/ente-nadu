# Capacity Plan for 1k-Concurrent Pilot (Single VM)

## Target

- 1,000 concurrent active users.
- Read-heavy traffic on map/report pages.
- Moderate writes (report submit + classify preview).

## Recommended VM

- 16 vCPU
- 64 GB RAM
- 1 TB NVMe SSD
- Ubuntu 22.04+ with Docker Engine + Compose v2

## Service Budget (Starting Point)

- API (`gunicorn`): 4 workers, 6-8 GB RAM.
- Web (`next start`): 2-3 GB RAM.
- Worker pool (`rq`): 8-12 GB RAM total.
- Postgres (PostGIS): 16-20 GB RAM reserved.
- Redis: 1-2 GB RAM.
- MinIO: 6-8 GB RAM (watch disk growth).

## Scaling Order (Single VM)

1. Increase API workers to remove request queueing.
2. Add worker replicas when classification backlog rises.
3. Tune Postgres memory/connections only after query/index checks.
4. Move media storage off-VM when disk growth becomes the primary risk.

## Success Conditions

- API read p95 remains stable under load test.
- Classify queue lag stays below 5 minutes at steady state.
- No sustained 5xx spike during mixed traffic profile.
- Backup and restore dry run passes before pilot.
