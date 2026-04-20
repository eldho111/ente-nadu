from redis import Redis
from rq import Queue, Worker

from worker_app.config import get_settings
import os

settings = get_settings()


def main() -> None:
    redis_conn = Redis.from_url(settings.redis_url)
    queue_names_raw = os.getenv("WORKER_QUEUES", "classification")
    queue_names = [name.strip() for name in queue_names_raw.split(",") if name.strip()]
    queues = [Queue(name, connection=redis_conn) for name in queue_names]
    with_scheduler = os.getenv("WORKER_WITH_SCHEDULER", "true").lower() in {"1", "true", "yes", "y"}
    worker = Worker(queues, connection=redis_conn)
    worker.work(with_scheduler=with_scheduler)


if __name__ == "__main__":
    main()
