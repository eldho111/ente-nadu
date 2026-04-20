from redis import Redis
from rq import Queue, Retry

from app.core.config import get_settings

settings = get_settings()


redis_conn = Redis.from_url(settings.redis_url)
classification_queue = Queue("classification", connection=redis_conn)


def enqueue_report_classification(report_id: str) -> None:
    classification_queue.enqueue(
        "worker_app.jobs.process_report_classification",
        report_id,
        job_timeout=120,
        retry=Retry(max=5, interval=[10, 30, 60, 120, 300]),
    )
