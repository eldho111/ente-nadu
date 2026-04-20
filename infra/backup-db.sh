#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUT_DIR=${1:-./backups}
mkdir -p "$OUT_DIR"

PG_CONTAINER=${PG_CONTAINER:-civic-postgres}
PG_DB=${POSTGRES_DB:-civic}
PG_USER=${POSTGRES_USER:-civic}

docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$OUT_DIR/civic_${TIMESTAMP}.sql.gz"
echo "Backup created at $OUT_DIR/civic_${TIMESTAMP}.sql.gz"