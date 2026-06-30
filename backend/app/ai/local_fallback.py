from app.ai.gemini import GeminiBillExtraction, GeminiBillItem


def local_business_answer(question: str, context: dict) -> str:
    dashboard = context["dashboard"]
    products = context["products"]
    lowered = question.lower()

    if "low" in lowered and "stock" in lowered:
        low_stock = [p for p in products if p["current_stock"] <= p["minimum_stock"]]
        if not low_stock:
            return "No products are currently below their minimum stock level."
        return "Low stock products: " + ", ".join(f'{p["name"]} ({p["current_stock"]} left)' for p in low_stock) + "."
    if "profit" in lowered and "month" in lowered:
        return f'This month profit after recorded expenses is Rs. {dashboard["monthly_profit"]}.'
    if "profit" in lowered and "today" in lowered:
        return f'Today profit after recorded expenses is Rs. {dashboard["today_profit"]}.'
    if "blocked" in lowered or "inventory" in lowered:
        return f'Money blocked in current inventory is Rs. {dashboard["blocked_inventory_value"]}.'
    if "customer" in lowered and ("most" in lowered or "spend" in lowered):
        customer = context.get("top_customer")
        return f'{customer["name"]} has the highest recorded spending at Rs. {customer["spending"]}.' if customer else "There is not enough customer sales history yet."
    if "reorder" in lowered:
        reorder = [p for p in products if p["current_stock"] <= p["minimum_stock"]]
        return "Reorder: " + ", ".join(p["name"] for p in reorder) + "." if reorder else "No immediate reorder is required."
    return f'Business health is {dashboard["business_health_summary"]}. Today sales are Rs. {dashboard["today_sales"]}, and pending payments are Rs. {dashboard["pending_payments"]}.'


def local_bill_extraction(bill_type: str, filename: str, content_size: int, inventory_catalog: list[dict]) -> GeminiBillExtraction:
    selected_type = bill_type if bill_type in {"buying", "selling"} else "buying" if any(word in filename.lower() for word in ["buy", "purchase", "supplier"]) else "selling"
    items: list[GeminiBillItem] = []
    for index, product in enumerate(inventory_catalog[:2]):
        price_key = "purchase_price" if selected_type == "buying" else "selling_price"
        items.append(GeminiBillItem(product_id=product["id"], name=product["name"], category="Catalog match", brand=product["brand"], quantity=2 if index == 0 and content_size > 250000 else 1, unit_price=float(product[price_key]), confidence=0.58 - (index * 0.08)))

    subtotal = sum(item.quantity * item.unit_price for item in items)
    tax = round(subtotal * 0.18, 2)
    return GeminiBillExtraction(
        bill_type=selected_type,
        party_name="Supplier" if selected_type == "buying" else "Walk-in Customer",
        invoice_number=f"LOCAL-{abs(hash((filename, content_size))) % 90000 + 10000}",
        bill_date=None,
        confidence=0.52,
        subtotal=subtotal,
        tax=tax,
        total=subtotal + tax,
        warnings=[
            "Gemini was unavailable, so local fallback created this draft from inventory data.",
            "Local fallback cannot truly read image text. Verify every field before saving.",
        ],
        items=items,
    )
