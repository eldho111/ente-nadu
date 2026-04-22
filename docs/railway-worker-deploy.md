# Deploying the RQ Worker on Railway

## Why this matters

Ente Nadu's backend is split into two runtime processes:

1. **API** (FastAPI, exposed to the web) — accepts report submissions, serves read endpoints. Runs at `ente-nadu-production.up.railway.app`.
2. **Worker** (Python RQ consumer) — picks up async jobs from Redis and does the heavy work: downloads the uploaded image, runs AI classification, blurs + publishes to the public bucket, creates clusters, writes `description_ai`, `category_ai`, `confidence`, `severity_ai`, and sets `media.public_url`.

**If the worker isn't running, this is what the user sees:**

- `description_ai` stays `NULL` → the report detail page shows "AI classification in progress" and (after 10 min) "AI classification hasn't run for this report — the background worker may be offline."
- `category_ai`, `confidence`, `severity_ai` stay empty.
- `media.public_url` stays `NULL` → the Evidence block shows "Processing media — refresh in a minute" and (after 10 min) "Media processing is stuck."
- Reports still save and show on the map, but every submitted report looks half-finished.

The API enqueues jobs to Redis regardless of whether the worker is listening — jobs just accumulate until the worker picks them up.

---

## What to deploy

Look at `infra/docker-compose.prod.yml` — there are three worker services. Two of them (`worker-a`, `worker-b`) are horizontal replicas for throughput. The third (`worker-scheduler`) is an RQ worker with `WORKER_WITH_SCHEDULER=true` so delayed / retry jobs fire on schedule.

For Railway (free / hobby tier), **one worker process is enough** to start. The `worker-scheduler` variant is recommended because it handles both instant jobs and scheduled ones.

### Container
- Path: `worker/` in this repo.
- Dockerfile: `worker/Dockerfile` (already builds; installs from `worker/requirements.txt`).
- Start command: `python -m worker_app.worker_main`

### Env vars the worker needs

These must match what the API is already using:

| Variable | Same value as API? | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ yes | Points at the same Postgres instance |
| `REDIS_URL` | ✅ yes | Points at the same Redis instance |
| `API_INTERNAL_BASE_URL` | Set to the public API URL (e.g. `https://ente-nadu-production.up.railway.app`) | Worker calls this for AI classification |
| `S3_ENDPOINT_URL` | ✅ yes | Cloudflare R2 endpoint |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | ✅ yes | R2 credentials |
| `S3_BUCKET_RAW` | ✅ yes | Raw upload bucket |
| `S3_BUCKET_PUBLIC` | ✅ yes | Blurred public bucket |
| `WORKER_QUEUES` | `classification` (default) | Queue names to consume |
| `WORKER_WITH_SCHEDULER` | `true` | Enables scheduled-job firing |

**Optional:** set `SENTRY_DSN` if you want error reporting.

---

## Step by step on Railway

1. **New Service → Deploy from GitHub repo** → pick this repo.
2. **Settings → Service → Source**:
   - Root Directory: `worker`
   - Dockerfile path: `Dockerfile` (relative to root dir)
3. **Settings → Deploy → Start command:**
   ```
   python -m worker_app.worker_main
   ```
4. **Variables** — copy everything from the API service (use Railway's shared variables or the "Reference" feature to avoid drift). Add the two worker-specific ones:
   ```
   WORKER_QUEUES=classification
   WORKER_WITH_SCHEDULER=true
   ```
5. **Networking** — the worker does NOT expose any public port. Disable "Generate Domain." It communicates outbound: to Postgres, Redis, Cloudflare R2, and the API's HTTPS endpoint.
6. **Deploy.** Railway builds the `worker/Dockerfile` and runs the start command.

---

## Verification

### Railway logs
In the worker service logs you should see RQ starting up:

```
*** Listening on classification...
```

Then, once someone submits a report, you'll see:

```
worker.jobs - Processing classification for report abc123-...
worker.jobs - Successfully classified report abc123-...
```

If the worker is healthy but unable to reach the API:
```
worker.ai_service - AI classification via API failed, using fallback: ...
```
— jobs still finish but `description_ai` will be the fallback string. Check `API_INTERNAL_BASE_URL`.

### End-to-end test
1. Submit a report from `www.ente-nadu.in/report` with a photo.
2. Within ~10 seconds, reload the report detail page.
3. You should see:
   - An AI-generated summary in the description area (not "AI classification in progress").
   - The blurred photo in the Evidence block (not "Processing media").

### Queue depth check
To see how many jobs are queued up right now, run this on a box that has `redis-cli` access to your Redis:

```
redis-cli LLEN rq:queue:classification
```

- `0` → worker is keeping up ✓
- Any positive number that keeps growing → worker is down or overwhelmed.

---

## Scaling

If one worker can't keep up (Railway logs show queue backlog growing):

1. Spin up another instance of the same service — Railway supports replicas.
2. Set `WORKER_WITH_SCHEDULER=false` on the extra replicas (only one scheduler should run — avoid duplicate scheduled jobs).
3. The default R2 + Groq free tiers handle ~14,400 classifications/day. At that scale, two worker replicas are plenty.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Logs show `Connection refused` to Redis | `REDIS_URL` wrong — make sure it's the same as the API's |
| Logs show `psycopg.OperationalError` | `DATABASE_URL` wrong or Postgres firewall blocks worker |
| Logs show `AI classification via API failed` | `API_INTERNAL_BASE_URL` unreachable from worker; or API itself is down; or Groq/Gemini keys unset on API |
| `description_ai` updates but media stays unprocessed | R2 creds / buckets missing — check `S3_*` env vars |
| Worker boots but never processes a job | Queue name mismatch — `WORKER_QUEUES=classification` must match the API's enqueue queue name |
