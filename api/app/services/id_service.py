import secrets
import string
from datetime import datetime, timezone


def generate_public_id(length: int = 10) -> str:
    """Generate a cryptographically secure public report ID.

    Uses secrets.choice() instead of random.choice() to prevent
    enumeration attacks on public report IDs.
    """
    alphabet = string.ascii_uppercase + string.digits
    return "RPT-" + "".join(secrets.choice(alphabet) for _ in range(length))


def generate_token_number(prefix: str = "CP") -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    numeric = secrets.randbelow(900000) + 100000
    return f"{prefix}-{date_part}-{numeric}"
