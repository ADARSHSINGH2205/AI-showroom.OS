import logging
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.gemini import extract_bill_with_gemini, generate_business_answer
from app.ai.local_fallback import local_bill_extraction, local_business_answer
from app.core.config import get_settings
from app.models.ai import AIInteraction
from app.models.catalog import Product
from app.models.customer import Customer
from app.models.sale import Sale
from app.schemas.ai import AIAnswer, BillDetection, DetectedBillItem
from app.services.dashboard_service import dashboard_summary


logger = logging.getLogger(__name__)


def _business_context(db: Session) -> dict:
    summary = dashboard_summary(db)
    products = db.query(Product).order_by(Product.current_stock.asc()).all()
    top_customer = (
        db.query(Customer.name, func.coalesce(func.sum(Sale.total), 0).label("spending"))
        .outerjoin(Sale, Sale.customer_id == Customer.id)
        .group_by(Customer.id)
        .order_by(func.coalesce(func.sum(Sale.total), 0).desc())
        .first()
    )
    return {
        "dashboard": summary.model_dump(mode="json"),
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "current_stock": p.current_stock,
                "minimum_stock": p.minimum_stock,
                "purchase_price": str(p.purchase_price),
                "selling_price": str(p.selling_price),
                "status": p.status.value,
            }
            for p in products
        ],
        "top_customer": {"name": top_customer.name, "spending": str(top_customer.spending)} if top_customer else None,
    }


async def answer_business_question(db: Session, user_id: int, question: str) -> AIAnswer:
    settings = get_settings()
    context = _business_context(db)
    provider = "local-analytics-fallback"

    if settings.gemini_api_key:
        try:
            answer, model_used = await generate_business_answer(question, context)
            provider = f"gemini:{model_used}"
        except Exception:
            logger.exception("Gemini business assistant failed; using local analytics fallback.")
            answer = local_business_answer(question, context)
    else:
        answer = local_business_answer(question, context)

    db.add(AIInteraction(user_id=user_id, provider=provider, prompt=question, response=answer, context_summary=context))
    db.commit()
    return AIAnswer(answer=answer, used_live_database_context=True, provider=provider)


async def detect_bill_from_image(db: Session, bill_type: str, filename: str, mime_type: str, content: bytes) -> BillDetection:
    settings = get_settings()
    catalog = [
        {
            "id": product.id,
            "name": product.name,
            "brand": product.brand,
            "purchase_price": str(product.purchase_price),
            "selling_price": str(product.selling_price),
            "stock": product.current_stock,
        }
        for product in db.query(Product).order_by(Product.name).all()
    ]
    provider = "local-bill-fallback"

    if settings.gemini_api_key:
        try:
            extraction, model_used = await extract_bill_with_gemini(bill_type=bill_type, filename=filename, mime_type=mime_type, content=content, inventory_catalog=catalog)
            provider = f"gemini:{model_used}"
        except Exception:
            logger.exception("Gemini bill extraction failed; using local bill fallback.")
            extraction = local_bill_extraction(bill_type, filename, len(content), catalog)
    else:
        extraction = local_bill_extraction(bill_type, filename, len(content), catalog)

    return BillDetection(
        bill_type=extraction.bill_type,
        party_name=extraction.party_name,
        invoice_number=extraction.invoice_number,
        bill_date=extraction.bill_date,
        confidence=extraction.confidence,
        subtotal=Decimal(str(extraction.subtotal)),
        tax=Decimal(str(extraction.tax)),
        total=Decimal(str(extraction.total)),
        warnings=extraction.warnings,
        items=[DetectedBillItem(product_id=item.product_id, name=item.name, category=item.category, brand=item.brand, quantity=item.quantity, unit_price=Decimal(str(item.unit_price)), confidence=item.confidence) for item in extraction.items],
        provider=provider,
    )


