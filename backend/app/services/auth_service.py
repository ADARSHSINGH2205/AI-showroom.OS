from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    password_hash_needs_update,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse


def authenticate(db: Session, username: str, password: str) -> TokenResponse | None:
    normalized_username = username.strip()
    user = (
        db.query(User)
        .filter(func.lower(User.username) == normalized_username.lower(), User.is_active.is_(True))
        .first()
    )
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_valid = verify_password(password, password_hash)
    if user is None or not password_valid:
        return None

    if password_hash_needs_update(user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)), user=user)
