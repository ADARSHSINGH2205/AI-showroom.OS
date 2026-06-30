# Security and deployment checklist

No internet-facing application can be guaranteed impossible to hack. Production security depends on the code, host, network, credentials, updates, monitoring, and operating practices working together.

## Before the first GitHub push

- Keep .env, database files, backups, logs, private keys, and customer bill images out of Git.
- Track .env.example because it contains names and placeholders only.
- Enable GitHub secret scanning, push protection, Dependabot alerts, private vulnerability reporting, and two-factor authentication.
- Protect main: require pull requests and the Security and quality workflow.
- Revoke any API key or token previously pasted into chat, email, screenshots, logs, or a public location.

## Production configuration

- Set ENVIRONMENT=production.
- Generate SECRET_KEY with a cryptographic random generator; use at least 48 characters.
- Use a unique owner password of at least 12 characters, preferably from a password manager.
- Use PostgreSQL with a unique database password. Never deploy the local SQLite database.
- Set CORS_ORIGINS to the exact HTTPS frontend origin.
- Set ALLOWED_HOSTS to the exact API hostname.
- Keep API documentation disabled in production.
- Store secrets in the host or cloud secret manager, not in Docker images or Compose files.

## Network and TLS

- Put the frontend and API behind Caddy, Nginx, or a managed HTTPS load balancer.
- Expose only ports 80 and 443 publicly. Keep PostgreSQL, port 8010, and the container frontend port private.
- Enable an operating-system firewall, automatic security updates, and SSH keys. Disable password-based root SSH.
- Configure trusted proxy addresses explicitly if proxy-forwarded client IPs are later used for rate limiting.

## Data protection

- Encrypt VPS disks and database backups.
- Back up PostgreSQL daily and test restoration regularly.
- Restrict backup access and define retention periods for customer and AI interaction data.
- Gemini receives uploaded bill images and selected business context. Confirm that this is acceptable for the showroom's privacy requirements.
- Never log credentials, authorization headers, bill images, or full customer records.

## Operations

- Run pytest backend/tests -q, npm audit --audit-level=high, npm run build, and a Python dependency audit before deployment.
- Review Dependabot alerts weekly and patch critical vulnerabilities immediately.
- Monitor failed logins, repeated 401/403/429 responses, unexpected deletions, and database backup failures.
- Rotate owner, database, JWT, and AI credentials after suspected exposure.
- The built-in login limiter is process-local. Use a shared Redis-backed limiter before running multiple API replicas.
- Use a dedicated transactional email/SMS/WhatsApp provider account with restricted credentials when message delivery becomes production-critical.
