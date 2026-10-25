from datetime import datetime, timezone

def utcnow():
    """Returns current UTC datetime as a naive datetime object for SQLAlchemy compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
