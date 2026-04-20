#!/usr/bin/env bash
set -euo pipefail

docker compose -f infra/docker-compose.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.yml exec api python -m app.db.init_db

echo "Bootstrap complete"