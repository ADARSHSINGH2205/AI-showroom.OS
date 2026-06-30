# Database Design

## Main Tables
- `users`: authorized owner and future salesman accounts.
- `categories`: furniture, electronics, and future categories.
- `suppliers`: supplier profile and outstanding amount.
- `products`: product master and current stock snapshot.
- `inventory_movements`: append-only stock history.
- `customers`: customer identity and contact data.
- `sales`: invoice header, payment status, and profit.
- `sale_items`: historical product prices and line profit.
- `purchases`: supplier purchase bill header.
- `purchase_items`: purchase lines and historical unit cost.
- `expenses`: rent, electricity, salary, transport, miscellaneous.
- `ai_interactions`: AI audit history.

## Why Historical Prices Exist
Product prices can change. A previous invoice must remain accurate, so sale and purchase line items store the actual prices used at that time.

## Dashboard Formulas
- Today sales: sum of sales totals created today.
- Today profit: sale profit minus expenses for today.
- Monthly profit: monthly sale profit minus monthly expenses.
- Low stock: current stock less than or equal to minimum stock.
- Dead stock: currently zero stock in the first release; the 90-day no-sale report will be added separately.
- Pending payments: sale total minus payment amount.
- Money blocked in inventory: current stock multiplied by purchase price.
