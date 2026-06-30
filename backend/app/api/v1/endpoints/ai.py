from typing import Literal

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.core.config import get_settings
from app.core.uploads import validate_bill_image
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import AIAnswer, AIQuestion, BillDetection
from app.services.ai_service import answer_business_question, detect_bill_from_image

router = APIRouter()


@router.post("/ask", response_model=AIAnswer)
async def ask_ai(
    payload: AIQuestion,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> AIAnswer:
    return await answer_business_question(db, current_user.id, payload.question)


@router.post("/bill-detect", response_model=BillDetection)
async def detect_bill(
    file: UploadFile,
    bill_type: Literal["auto", "buying", "selling"] = Query("auto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> BillDetection:
    settings = get_settings()
    try:
        content = await file.read(settings.max_bill_upload_bytes + 1)
    finally:
        await file.close()
    mime_type = validate_bill_image(file.content_type, content, settings.max_bill_upload_bytes)
    return await detect_bill_from_image(db, bill_type, "uploaded-bill", mime_type, content)
