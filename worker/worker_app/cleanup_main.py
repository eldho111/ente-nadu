from worker_app.jobs import cleanup_expired_media


def main() -> None:
    deleted = cleanup_expired_media()
    print(f"Deleted {deleted} expired media rows")


if __name__ == "__main__":
    main()