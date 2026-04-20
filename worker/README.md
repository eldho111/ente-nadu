# Worker Service

Redis RQ worker for asynchronous classification and media publication workflow.

## Run

```bash
pip install -r requirements.txt
python -m worker_app.worker_main
```

Jobs:

- `worker_app.jobs.process_report_classification`
- `worker_app.jobs.cleanup_expired_media`
