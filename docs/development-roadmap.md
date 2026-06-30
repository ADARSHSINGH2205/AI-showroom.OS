# Development Roadmap

## Foundation Completed
- Modular backend and frontend structure.
- PostgreSQL SQLAlchemy models.
- Alembic migration bootstrap.
- JWT owner login with no signup.
- Products, inventory movements, sales, purchases, customers, suppliers, expenses, reports, dashboard, and AI routes.
- React owner console with AI/manual buying and selling bill desk.
- Docker Compose for PostgreSQL, FastAPI, and React.
- Core tests for auth, protected routes, sales, dashboard, and AI context.

## Next Production Steps
1. Replace initial metadata migration with fully explicit generated Alembic operations before first production release.
2. Add complete CRUD screens for products, customers, suppliers, and expenses.
3. Add invoice PDF generation and Excel report export.
4. Add real OpenAI or Gemini adapters for OCR and natural-language answers.
5. Add image storage with validation and backups.
6. Add refresh tokens, logout/revocation, rate limiting, audit logs, and password rotation.
7. Add automated database backups and restore drills.
8. Add salesman role permissions and activity tracking.
