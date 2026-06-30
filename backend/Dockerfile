FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install --no-cache-dir --upgrade pip==26.1.2 \
    && pip install --no-cache-dir -r requirements.txt \
    && groupadd --system showroom \
    && useradd --system --gid showroom --home-dir /app showroom

COPY --chown=showroom:showroom . .

USER showroom

EXPOSE 8010
CMD ["sh", "-c", "alembic upgrade head && python -m app.db.seed_cli && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8010} --no-server-header"]