# VPS deployment guide

This deployment keeps PostgreSQL, backend, and frontend containers private. Only Caddy exposes ports 80 and 443 and gives HTTPS automatically.

## 1. Server requirements

Use an Ubuntu LTS VPS with at least 2 vCPU, 4 GB RAM, and 40 GB disk for a small showroom. Install Docker Engine and Docker Compose Plugin from Docker's official repository.

Open only these firewall ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Point DNS records before starting:

- `APP_DOMAIN` -> VPS public IP
- `API_DOMAIN` -> VPS public IP

## 2. Prepare environment

On the server:

```bash
git clone <your-github-repo-url> ai-showroom-os
cd ai-showroom-os
cp .env.example .env
```

Edit `.env` and set real values:

```env
ENVIRONMENT=production
APP_DOMAIN=your-frontend-domain.com
API_DOMAIN=api.your-frontend-domain.com
CORS_ORIGINS=["https://your-frontend-domain.com"]
ALLOWED_HOSTS=["api.your-frontend-domain.com"]
VITE_API_URL=https://api.your-frontend-domain.com/api/v1
SECRET_KEY=<generate-a-long-random-secret>
SEED_OWNER_USERNAME=<owner-login-name>
SEED_OWNER_PASSWORD=<strong-password-at-least-12-characters>
POSTGRES_PASSWORD=<strong-database-password>
GEMINI_API_KEY=<your-gemini-api-key>
SMS_PROVIDER=whatsapp
OWNER_MOBILE_NUMBER=91xxxxxxxxxx
```

Generate a strong secret:

```bash
python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(64))
PY
```

Do not commit `.env`. Keep it only on the server.

## 3. Start production

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d
```

Check status:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml ps
docker compose -f docker-compose.yml -f docker-compose.production.yml logs --tail=100 backend
docker compose -f docker-compose.yml -f docker-compose.production.yml logs --tail=100 caddy
```

Expected public URLs:

- Frontend: `https://$APP_DOMAIN`
- API health: `https://$API_DOMAIN/health`
- API ready: `https://$API_DOMAIN/ready`

API docs are disabled in production by design.

## 4. Backups

Create daily PostgreSQL backups outside the repo:

```bash
mkdir -p ~/showroom-backups
cat > ~/backup-showroom.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
cd ~/ai-showroom-os
stamp=$(date +%Y%m%d-%H%M%S)
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-showroom}" ai_showroom_os | gzip > "$HOME/showroom-backups/ai-showroom-$stamp.sql.gz"
find "$HOME/showroom-backups" -type f -name 'ai-showroom-*.sql.gz' -mtime +14 -delete
SH
chmod +x ~/backup-showroom.sh
(crontab -l 2>/dev/null; echo "15 2 * * * $HOME/backup-showroom.sh") | crontab -
```

Test restore on a separate database before trusting backups.

## 5. Secure operations

- Use SSH keys, disable root password login, and keep the VPS updated.
- Enable GitHub secret scanning, Dependabot alerts, and branch protection.
- Rotate any Gemini/SMS/API key that was pasted into chat or pushed anywhere by mistake.
- Keep Docker images updated: `docker compose pull && docker compose up --build -d` after testing.
- Monitor backend logs for repeated 401, 403, 429, and destructive delete actions.
- For multiple backend replicas later, replace the process-local login limiter with Redis.