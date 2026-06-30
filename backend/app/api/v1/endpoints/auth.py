from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import login_rate_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserRead
from app.services.auth_service import authenticate

router = APIRouter()


def _rate_limit_keys(request: Request, username: str) -> list[str]:
    client_ip = request.client.host if request.client else "unknown"
    return [f"ip:{client_ip}", f"account:{client_ip}:{username.strip().casefold()}"]


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    keys = _rate_limit_keys(request, payload.username)
    retry_after = login_rate_limiter.retry_after(keys)
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    token = authenticate(db, payload.username, payload.password)
    if token is None:
        login_rate_limiter.record_failure(keys)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_rate_limiter.reset(keys)
    return token


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
