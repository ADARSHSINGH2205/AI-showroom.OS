from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import dashboard_summary

router = APIRouter()


@router.get("", response_model=DashboardSummary)
def read_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_owner)) -> DashboardSummary:
    return dashboard_summary(db)
