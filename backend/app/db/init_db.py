from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.models.ai import AIInteraction
from app.models.enums import UserRole
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.models.user import User


def seed_initial_data(db: Session) -> None:
    settings = get_settings()
    owner = db.query(User).filter(User.username == settings.seed_owner_username).one_or_none()
    if owner is None:
        owner = User(
            username=settings.seed_owner_username,
            password_hash=hash_password(settings.seed_owner_password),
            role=UserRole.owner,
            is_active=True,
        )
        db.add(owner)
        db.flush()
    else:
        owner.role = UserRole.owner
        owner.is_active = True
    if not verify_password(settings.seed_owner_password, owner.password_hash):
        owner.password_hash = hash_password(settings.seed_owner_password)

    duplicate_owners = (
        db.query(User)
        .filter(User.role == UserRole.owner, User.id != owner.id)
        .all()
    )
    for duplicate in duplicate_owners:
        db.query(Sale).filter(Sale.created_by_user_id == duplicate.id).update({"created_by_user_id": owner.id})
        db.query(Purchase).filter(Purchase.created_by_user_id == duplicate.id).update({"created_by_user_id": owner.id})
        db.query(AIInteraction).filter(AIInteraction.user_id == duplicate.id).update({"user_id": owner.id})
        db.delete(duplicate)
    db.commit()
