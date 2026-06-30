from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.middleware import SecurityHeadersMiddleware
from app.db.base import Base
from app.db.init_db import seed_initial_data
from app.db.session import SessionLocal, engine
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.environment != "production":
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_initial_data(db)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    production = settings.environment == "production"
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
        openapi_url=None if production else "/openapi.json",
    )
    app.add_middleware(SecurityHeadersMiddleware, production=production)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts, www_redirect=False)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        expose_headers=["Content-Disposition", "X-Request-ID", "Retry-After"],
        max_age=600,
    )
    app.include_router(api_router)

    @app.get("/health")
    def healthcheck():
        return {"status": "ok"}

    @app.get("/ready")
    def readiness_check():
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service is not ready",
            ) from None
        return {"status": "ready"}

    return app


app = create_app()
