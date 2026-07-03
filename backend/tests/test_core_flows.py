from datetime import date

from app.core.config import get_settings


TODAY = date.today().isoformat()


def login_token(client) -> str:
    settings = get_settings()
    response = client.post("/api/v1/auth/login", json={"username": settings.seed_owner_username, "password": settings.seed_owner_password})
    assert response.status_code == 200
    return response.json()["access_token"]


def create_test_product(client, headers, *, name: str = "Test Product", opening_stock: int = 5):
    response = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "category_name": "Test Category",
            "supplier_name": "Test Supplier",
            "brand": "Test Brand",
            "name": name,
            "purchase_price": "1000",
            "selling_price": "1500",
            "minimum_stock": 1,
            "opening_stock": opening_stock,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_healthcheck(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_owner_login_and_empty_protected_products(client):
    token = login_token(client)
    response = client.get("/api/v1/products", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == []


def test_products_are_protected(client):
    response = client.get("/api/v1/products")
    assert response.status_code == 401


def test_create_sale_reduces_stock_and_updates_dashboard(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    product = create_test_product(client, headers)
    sale_response = client.post(
        "/api/v1/sales",
        headers=headers,
        json={
            "bill_date": TODAY,
            "customer_name": "Test Customer",
            "payment_amount": product["selling_price"],
            "items": [{"product_id": product["id"], "quantity": 1, "unit_selling_price": product["selling_price"]}],
        },
    )
    assert sale_response.status_code == 201
    assert sale_response.json()["bill_date"] == TODAY
    assert sale_response.json()["profit_amount"] != "0.00"
    products = client.get("/api/v1/products", headers=headers).json()
    sold_product = next(item for item in products if item["id"] == product["id"])
    assert sold_product["current_stock"] == 4
    dashboard = client.get("/api/v1/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["today_sales"] != "0.00"


def test_buying_bill_creates_or_auto_matches_product_and_adds_stock(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/v1/purchases",
        headers=headers,
        json={
            "bill_date": TODAY,
            "supplier_name": "New Supplier",
            "invoice_number": "BUY-NEW-001",
            "payment_amount": "2500",
            "items": [{
                "name": "New AI Detected Chair",
                "category_name": "Furniture",
                "brand": "Fresh Brand",
                "selling_price": "1600",
                "quantity": 2,
                "unit_cost": "1250",
            }],
        },
    )
    assert response.status_code == 201
    products = client.get("/api/v1/products", headers=headers).json()
    created = next(product for product in products if product["name"] == "New AI Detected Chair")
    assert created["current_stock"] == 2
    assert created["purchase_price"] == "1250.00"
    assert created["selling_price"] == "1600.00"

    repeat = client.post(
        "/api/v1/purchases",
        headers=headers,
        json={
            "bill_date": TODAY,
            "supplier_name": "Another Supplier",
            "invoice_number": "BUY-REPEAT-002",
            "payment_amount": "1250",
            "items": [{
                "name": "new ai detected chair",
                "brand": "fresh brand",
                "quantity": 1,
                "unit_cost": "1250",
            }],
        },
    )
    assert repeat.status_code == 201
    products = client.get("/api/v1/products", headers=headers).json()
    matching = [product for product in products if product["name"].lower() == "new ai detected chair"]
    assert len(matching) == 1
    assert matching[0]["current_stock"] == 3


def test_manual_stock_reduction_and_stock_only_removal_keeps_product(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    product = create_test_product(client, headers, name="Removable Product", opening_stock=2)
    adjustment = client.post(
        "/api/v1/inventory/movements",
        headers=headers,
        json={"product_id": product["id"], "movement_type": "adjustment_out", "quantity": 2, "note": "Damaged stock"},
    )
    assert adjustment.status_code == 201
    removed = client.delete(f'/api/v1/products/{product["id"]}?mode=stock_only', headers=headers)
    assert removed.status_code == 204
    remaining = client.get("/api/v1/products", headers=headers).json()
    kept = next(item for item in remaining if item["id"] == product["id"])
    assert kept["current_stock"] == 0


def test_purge_product_removes_related_revenue_profit_and_product_trace(client):
    from decimal import Decimal

    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    product = create_test_product(client, headers, name="Purge Product", opening_stock=3)
    before = client.get("/api/v1/dashboard", headers=headers).json()
    sale_response = client.post(
        "/api/v1/sales",
        headers=headers,
        json={
            "bill_date": TODAY,
            "customer_name": "Purge Customer",
            "payment_amount": product["selling_price"],
            "items": [{"product_id": product["id"], "quantity": 1, "unit_selling_price": product["selling_price"]}],
        },
    )
    assert sale_response.status_code == 201
    sale = sale_response.json()
    after_sale = client.get("/api/v1/dashboard", headers=headers).json()
    assert Decimal(after_sale["today_sales"]) == Decimal(before["today_sales"]) + Decimal(sale["total"])

    removed = client.post(f'/api/v1/products/{product["id"]}/purge?confirmation=PURGE', headers=headers)
    assert removed.status_code == 200
    assert removed.json()["product_deleted"] is True
    after_purge = client.get("/api/v1/dashboard", headers=headers).json()
    assert Decimal(after_purge["today_sales"]) == Decimal(before["today_sales"])
    assert Decimal(after_purge["today_profit"]) == Decimal(before["today_profit"])
    remaining = client.get("/api/v1/products", headers=headers).json()
    assert all(item["id"] != product["id"] for item in remaining)


def test_whatsapp_bill_generation_rules_for_selling_and_buying(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    product = create_test_product(client, headers, name="WhatsApp Product", opening_stock=4)
    sale_response = client.post(
        "/api/v1/sales",
        headers=headers,
        json={
            "bill_date": TODAY,
            "customer_name": "WhatsApp Customer",
            "customer_phone": "919999999999",
            "payment_amount": product["selling_price"],
            "items": [{"product_id": product["id"], "quantity": 1, "unit_selling_price": product["selling_price"]}],
        },
    )
    assert sale_response.status_code == 201
    sale_bills = client.get(f'/api/v1/sales/{sale_response.json()["id"]}/sms-bills', headers=headers)
    assert sale_bills.status_code == 200
    sale_data = sale_bills.json()
    assert set(sale_data.keys()) == {"customer_bill", "owner_bill"}
    assert "Profit" not in sale_data["customer_bill"]["message"]
    assert "Profit after discount" in sale_data["owner_bill"]["message"]
    assert sale_data["customer_bill"]["whatsapp_url"].startswith("https://wa.me/919999999999?text=")
    assert sale_data["customer_bill"]["sms_provider"] == "whatsapp"
    assert f"Date: {date.today().strftime('%d %b %Y')}" in sale_data["customer_bill"]["message"]

    purchase_response = client.post(
        "/api/v1/purchases",
        headers=headers,
        json={
            "bill_date": TODAY,
            "supplier_name": "WhatsApp Supplier",
            "invoice_number": "BUY-WA-001",
            "payment_amount": "1000",
            "items": [{
                "name": "WhatsApp Purchase Item",
                "category_name": "Furniture",
                "brand": "Bill Brand",
                "selling_price": "1600",
                "quantity": 1,
                "unit_cost": "1000",
            }],
        },
    )
    assert purchase_response.status_code == 201
    purchase_bill = client.get(f'/api/v1/purchases/{purchase_response.json()["id"]}/sms-bill', headers=headers)
    assert purchase_bill.status_code == 200
    purchase_data = purchase_bill.json()
    assert set(purchase_data.keys()) == {"owner_bill"}
    assert "Owner Purchase Report" in purchase_data["owner_bill"]["message"]
    assert purchase_data["owner_bill"]["whatsapp_url"].startswith("https://wa.me/91")
    assert "customer_bill" not in purchase_data


def test_supplier_delete_supports_date_range_and_full_removal(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    supplier_name = "Strict Delete Supplier"

    for invoice, bill_date, quantity in [
        ("SUP-OLD-001", "2025-01-10", 2),
        ("SUP-NEW-001", TODAY, 1),
    ]:
        response = client.post(
            "/api/v1/purchases",
            headers=headers,
            json={
                "bill_date": bill_date,
                "supplier_name": supplier_name,
                "invoice_number": invoice,
                "payment_amount": "0",
                "items": [{
                    "name": "Supplier Delete Product",
                    "category_name": "Electronics",
                    "brand": "Delete Brand",
                    "selling_price": "2000",
                    "quantity": quantity,
                    "unit_cost": "1000",
                }],
            },
        )
        assert response.status_code == 201

    suppliers = client.get("/api/v1/suppliers", headers=headers).json()
    supplier = next(item for item in suppliers if item["name"] == supplier_name)

    range_delete = client.delete(
        f'/api/v1/suppliers/{supplier["id"]}?mode=range&confirmation=DELETE&date_from={TODAY}&date_to={TODAY}',
        headers=headers,
    )
    assert range_delete.status_code == 200
    assert range_delete.json()["purchases_removed"] == 1
    assert range_delete.json()["supplier_deleted"] is False

    full_delete = client.delete(
        f'/api/v1/suppliers/{supplier["id"]}?mode=all&confirmation=DELETE',
        headers=headers,
    )
    assert full_delete.status_code == 200
    assert full_delete.json()["purchases_removed"] == 1
    assert full_delete.json()["supplier_deleted"] is True
    remaining = client.get("/api/v1/suppliers", headers=headers).json()
    assert all(item["id"] != supplier["id"] for item in remaining)


def test_due_sales_can_be_paid_partially_and_fully(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    product = create_test_product(client, headers, name="Due Payment Product", opening_stock=3)
    sale_response = client.post(
        "/api/v1/sales",
        headers=headers,
        json={
            "bill_date": TODAY,
            "customer_name": "Due Customer",
            "customer_phone": "919111111111",
            "payment_amount": "0",
            "items": [{"product_id": product["id"], "quantity": 1, "unit_selling_price": product["selling_price"]}],
        },
    )
    assert sale_response.status_code == 201
    sale = sale_response.json()
    due_response = client.get("/api/v1/sales/due", headers=headers)
    assert due_response.status_code == 200
    assert any(item["id"] == sale["id"] for item in due_response.json())

    partial = client.post(f'/api/v1/sales/{sale["id"]}/payments', headers=headers, json={"amount": "500"})
    assert partial.status_code == 200
    assert partial.json()["payment_status"] == "partial"
    assert partial.json()["payment_amount"] == "500.00"

    remaining_due = str(float(partial.json()["total"]) - float(partial.json()["payment_amount"]))
    full = client.post(f'/api/v1/sales/{sale["id"]}/payments', headers=headers, json={"amount": remaining_due})
    assert full.status_code == 200
    assert full.json()["payment_status"] == "paid"
    due_after = client.get("/api/v1/sales/due", headers=headers).json()
    assert all(item["id"] != sale["id"] for item in due_after)


def test_due_purchases_can_be_paid_partially_and_fully(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    purchase_response = client.post(
        "/api/v1/purchases",
        headers=headers,
        json={
            "bill_date": TODAY,
            "supplier_name": "Due Supplier",
            "supplier_phone": "918888888888",
            "invoice_number": "BUY-DUE-001",
            "payment_amount": "0",
            "items": [{
                "name": "Supplier Due Item",
                "category_name": "Furniture",
                "brand": "Payable Brand",
                "selling_price": "2000",
                "quantity": 1,
                "unit_cost": "1200",
            }],
        },
    )
    assert purchase_response.status_code == 201
    purchase = purchase_response.json()
    due_response = client.get("/api/v1/purchases/due", headers=headers)
    assert due_response.status_code == 200
    assert any(item["id"] == purchase["id"] for item in due_response.json())
    assert next(item for item in due_response.json() if item["id"] == purchase["id"])["supplier_phone"] == "918888888888"

    partial = client.post(f'/api/v1/purchases/{purchase["id"]}/payments', headers=headers, json={"amount": "500"})
    assert partial.status_code == 200
    assert partial.json()["payment_amount"] == "500.00"

    remaining_due = str(float(partial.json()["total"]) - float(partial.json()["payment_amount"]))
    full = client.post(f'/api/v1/purchases/{purchase["id"]}/payments', headers=headers, json={"amount": remaining_due})
    assert full.status_code == 200
    assert full.json()["payment_amount"] == full.json()["total"]
    due_after = client.get("/api/v1/purchases/due", headers=headers).json()
    assert all(item["id"] != purchase["id"] for item in due_after)

def test_sale_invoice_and_statement_exports(client):
    token = login_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    product = create_test_product(client, headers, name="Export Product", opening_stock=2)
    sale_response = client.post(
        "/api/v1/sales",
        headers=headers,
        json={
            "bill_date": TODAY,
            "customer_name": "Export Customer",
            "customer_phone": "917777777777",
            "payment_amount": product["selling_price"],
            "items": [{"product_id": product["id"], "quantity": 1, "unit_selling_price": product["selling_price"]}],
        },
    )
    assert sale_response.status_code == 201
    sale = sale_response.json()

    dashboard = client.get("/api/v1/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert "monthly_distribution" in dashboard.json()
    assert any(item["id"] == sale["id"] for item in dashboard.json()["recent_sales"])

    csv_response = client.get(f'/api/v1/reports/sales/{sale["id"]}/invoice.csv', headers=headers)
    assert csv_response.status_code == 200
    assert "text/csv" in csv_response.headers["content-type"]
    assert sale["invoice_number"] in csv_response.text

    pdf_response = client.get(f'/api/v1/reports/sales/{sale["id"]}/invoice.pdf', headers=headers)
    assert pdf_response.status_code == 200
    assert pdf_response.content.startswith(b"%PDF")

    statement = client.get(f"/api/v1/reports/sales/statement.csv?start_date={TODAY}&end_date={TODAY}", headers=headers)
    assert statement.status_code == 200
    assert "Export Customer" in statement.text
    assert "Totals" in statement.text
def test_ai_uses_gemini_or_local_fallback(client):
    token = login_token(client)
    response = client.post(
        "/api/v1/ai/ask",
        headers={"Authorization": f"Bearer {token}"},
        json={"question": "How much money is blocked in inventory?"},
    )
    assert response.status_code == 200
    assert response.json()["used_live_database_context"] is True
    assert response.json()["provider"] == "local-analytics-fallback" or response.json()["provider"].startswith("gemini:")

