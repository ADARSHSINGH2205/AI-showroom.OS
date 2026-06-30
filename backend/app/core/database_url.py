def normalize_database_url(database_url: str) -> str:
    """Return a SQLAlchemy URL that works with psycopg v3.

    Render and several managed Postgres providers expose URLs as postgres:// or
    postgresql://. This project installs psycopg v3, so SQLAlchemy should use
    the explicit postgresql+psycopg:// driver form.
    """
    if database_url.startswith("postgres://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgres://")
    if database_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgresql://")
    return database_url