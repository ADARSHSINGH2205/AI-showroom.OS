# AI Showroom OS

Private business operating system for a furniture and electronics showroom.

## Current capabilities

- Secure JWT owner sign-in with persistent browser sessions and no public signup.
- Analytical dashboard with 14-day sales trend, margin, inventory value, stock risk, category performance, and recent invoices.
- Gemini-first bill image extraction for both buying and selling, with editable review before saving.
- Manual buying and selling bills with payment status, discount, tax, and immutable stock movement history.
- Product creation, inventory search, reorder alerts, customers, suppliers, expenses, transaction reports, CSV export, and print/PDF output.
- Gemini business copilot grounded in live database data, with deterministic local analytics fallback.

## Why there is no signup

This is a private business system. Public signup would allow unauthorized people to create accounts, so the first owner is provisioned from environment settings. Owner-controlled staff account management can be added without exposing public registration.

## Run locally

The current local launcher uses SQLite when Docker/PostgreSQL is unavailable:

```powershell
.\start-backend-local.ps1
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

Open `http://localhost:5174`. API documentation is at `http://localhost:8010/docs`.

Default local owner account is created from `.env` values. For real business use, set `SEED_OWNER_USERNAME`, `SEED_OWNER_PASSWORD`, and `SECRET_KEY` before starting the backend.

## Run with Docker and PostgreSQL

1. Copy `.env.example` to `.env`.
2. Set strong secrets and `GEMINI_API_KEY` in `.env`.
3. For production deployment, run:

   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.production.yml up --build --detach
   ```

4. Open the public frontend domain configured in `APP_DOMAIN`.

> In production, `APP_DOMAIN` should be the public frontend hostname and `API_DOMAIN` should be the public API hostname. `VITE_API_URL` must match the deployed backend API URL, for example `https://api.showroom.example.com/api/v1`.

## Verification

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run build
npm audit
```

Read `docs/architecture.md`, `docs/database-design.md`, and `docs/development-roadmap.md` for architecture and production milestones.
## Production handoff checklist

Before giving this to a client or using it with real business data:

- Remove any local/demo data from the database.
- Set `ENVIRONMENT=production`.
- Set a strong `SECRET_KEY`; the backend refuses known development defaults in production.
- Set a strong `SEED_OWNER_PASSWORD`; `owner123` is local-only and refused in production.
- Set `POSTGRES_PASSWORD` and use PostgreSQL, not SQLite.
- Set `CORS_ORIGINS` to the deployed frontend origin as a JSON array, for example `["https://showroom.example.com"]`.
- Set `VITE_API_URL` to the deployed backend API URL, for example `https://api.showroom.example.com/api/v1`.
- Set `OWNER_MOBILE_NUMBER` for owner bill copies. Set `SMS_PROVIDER=whatsapp` to generate free WhatsApp bill links, or `SMS_PROVIDER=console` for local testing.
- Rotate any Gemini key that was ever shared in chat or screenshots.

Production startup intentionally fails when required secrets are missing or unsafe.

