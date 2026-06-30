# Vercel + Render deployment

This project is now prepared for this production split:

- Frontend: Vercel
- Backend API: Render Web Service
- Database: Render PostgreSQL
- Auto update: every push to `Main` can redeploy both services

## Backend on Render

Use the repository's `render.yaml` as a Render Blueprint.

1. Open Render Dashboard.
2. Create a new Blueprint from your GitHub repo.
3. Select branch `Main`.
4. Render will create:
   - `ai-showroom-os-api`
   - `ai-showroom-os-db`
5. Before first deploy, set these Render environment variables. `DATABASE_URL` must be the internal connection URL from the active Render Postgres database:

```env
DATABASE_URL=<active-render-postgres-internal-url>
SEED_OWNER_USERNAME=<your-login-username>
SEED_OWNER_PASSWORD=<strong-password-at-least-12-characters>
GEMINI_API_KEY=<your-rotated-gemini-key>
OWNER_MOBILE_NUMBER=91xxxxxxxxxx
SMS_PROVIDER=whatsapp
```

The Render backend URL will normally be:

```text
https://ai-showroom-os-api.onrender.com
```

The Blueprint uses `ALLOWED_HOSTS=["*.onrender.com"]` so Render assigned hostnames can pass health checks. When you add a custom API domain later, replace it with that exact API hostname.

## Frontend on Vercel

Import the same GitHub repo in Vercel.

Project settings:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Install Command: npm ci
Output Directory: dist
```

Set this Vercel environment variable:

```env
VITE_API_URL=https://ai-showroom-os-api.onrender.com/api/v1
```

After Vercel deploys, copy the Vercel frontend domain, for example:

```text
https://ai-showroom-os.vercel.app
```

Then update Render:

```env
CORS_ORIGINS=["https://ai-showroom-os.vercel.app"]
```

## Automatic deploy from GitHub

There are two valid options.

Option A, simplest: enable auto-deploy in Render and Vercel GitHub integration. Every push to `Main` deploys automatically.

Option B, GitHub Actions: use `.github/workflows/deploy.yml` and add these GitHub repository secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
RENDER_DEPLOY_HOOK_URL
```

The workflow is written so missing deploy secrets skip that deployment instead of failing the whole repo.

## Future custom domain

When you buy a domain later, update only these values.

Vercel:

```text
Add your frontend domain in Vercel Domains.
```

Render:

```text
Add your API subdomain in Render Custom Domains.
```

Backend environment:

```env
CORS_ORIGINS=["https://yourdomain.com"]
ALLOWED_HOSTS=["api.yourdomain.com"]
```

Vercel environment:

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
```

Redeploy both services after changing environment variables.