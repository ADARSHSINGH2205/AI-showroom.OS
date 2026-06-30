from datetime import date
from decimal import Decimal
from io import StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.db.session import get_db
from app.models.sale import Sale
from app.models.user import User
from app.services.dashboard_service import dashboard_summary

router = APIRouter()


def _money(value: Decimal) -> str:
    return f"Rs {value:,.2f}"


def _csv_response(filename: str, rows: list[list[object]]) -> Response:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _escape_pdf_text(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _simple_pdf(filename: str, lines: list[str]) -> Response:
    y = 800
    commands = ["BT", "/F1 11 Tf", "50 820 Td"]
    for line in lines[:48]:
        commands.append(f"0 -16 Td ({_escape_pdf_text(line)}) Tj")
        y -= 16
        if y < 60:
            break
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1", errors="replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return Response(
        content=bytes(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _sale_or_404(db: Session, sale_id: int) -> Sale:
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


def _sale_invoice_rows(sale: Sale) -> list[list[object]]:
    due = max(sale.total - sale.payment_amount, Decimal("0"))
    rows: list[list[object]] = [
        ["AI Showroom OS"],
        ["Sale Invoice", sale.invoice_number],
        ["Date", sale.bill_date.isoformat()],
        ["Customer", sale.customer_name],
        ["Phone", sale.customer_phone or ""],
        [],
        ["Product", "Brand", "Qty", "Rate", "Line total"],
    ]
    for item in sale.items:
        rows.append([item.product.name, item.product.brand, item.quantity, item.unit_selling_price, item.line_total])
    rows.extend([
        [],
        ["Subtotal", sale.subtotal],
        ["Discount", sale.discount],
        ["Tax", sale.tax],
        ["Total", sale.total],
        ["Paid", sale.payment_amount],
        ["Due", due],
        ["Payment status", sale.payment_status.value],
    ])
    return rows


def _sale_invoice_pdf_lines(sale: Sale) -> list[str]:
    due = max(sale.total - sale.payment_amount, Decimal("0"))
    lines = [
        "AI Showroom OS - Sale Invoice",
        f"Invoice: {sale.invoice_number}",
        f"Date: {sale.bill_date.strftime('%d %b %Y')}",
        f"Customer: {sale.customer_name}",
        f"Phone: {sale.customer_phone or 'Not provided'}",
        "",
        "Items:",
    ]
    for index, item in enumerate(sale.items, start=1):
        lines.append(f"{index}. {item.product.name} ({item.product.brand}) x {item.quantity} @ {_money(item.unit_selling_price)} = {_money(item.line_total)}")
    lines.extend([
        "",
        f"Subtotal: {_money(sale.subtotal)}",
        f"Discount: {_money(sale.discount)}",
        f"Tax: {_money(sale.tax)}",
        f"Total: {_money(sale.total)}",
        f"Paid: {_money(sale.payment_amount)}",
        f"Due: {_money(due)}",
        f"Status: {sale.payment_status.value}",
    ])
    return lines


@router.get("/summary")
def report_summary(db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    summary = dashboard_summary(db)
    return {
        "daily": {"sales": summary.today_sales, "profit": summary.today_profit},
        "monthly": {"sales": summary.monthly_sales, "profit": summary.monthly_profit},
        "inventory": {"blocked_value": summary.blocked_inventory_value, "low_stock": summary.low_stock, "dead_stock": summary.dead_stock},
        "exports": {"pdf": "available", "excel": "csv"},
    }


@router.get("/sales/statement.csv")
def sales_statement_csv(start_date: date, end_date: date, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    sales = db.query(Sale).filter(Sale.bill_date.between(start_date, end_date)).order_by(Sale.bill_date.asc(), Sale.created_at.asc()).all()
    rows: list[list[object]] = [["Date", "Invoice", "Customer", "Phone", "Subtotal", "Discount", "Tax", "Total", "Paid", "Due", "Status", "Profit"]]
    total_sales = Decimal("0")
    total_paid = Decimal("0")
    total_due = Decimal("0")
    total_profit = Decimal("0")
    for sale in sales:
        due = max(sale.total - sale.payment_amount, Decimal("0"))
        total_sales += sale.total
        total_paid += sale.payment_amount
        total_due += due
        total_profit += sale.profit_amount
        rows.append([sale.bill_date.isoformat(), sale.invoice_number, sale.customer_name, sale.customer_phone or "", sale.subtotal, sale.discount, sale.tax, sale.total, sale.payment_amount, due, sale.payment_status.value, sale.profit_amount])
    rows.extend([[], ["Totals", "", "", "", "", "", "", total_sales, total_paid, total_due, "", total_profit]])
    return _csv_response(f"sales-statement-{start_date}-to-{end_date}.csv", rows)


@router.get("/sales/{sale_id}/invoice.csv")
def sale_invoice_csv(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    sale = _sale_or_404(db, sale_id)
    return _csv_response(f"invoice-{sale.invoice_number}.csv", _sale_invoice_rows(sale))


@router.get("/sales/{sale_id}/invoice.pdf")
def sale_invoice_pdf(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_owner)):
    sale = _sale_or_404(db, sale_id)
    return _simple_pdf(f"invoice-{sale.invoice_number}.pdf", _sale_invoice_pdf_lines(sale))
