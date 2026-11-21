# Beauty Queen E-Commerce — Production Go-Live Runbook

Use this checklist to launch **Beauty Queen** on a fresh Linux VPS (Ubuntu 22.04/24.04 or Debian 12) using the pre-built GitHub Container Registry (GHCR) Docker images.

---

## 1. Prerequisites on the Production Host
- Docker Engine 24+ & Docker Compose v2 (`docker compose version`)
- Domain DNS A/AAAA records pointed to the server IP (`yourdomain.com` and `www.yourdomain.com`)
- Ports `80` and `443` open in your firewall / cloud security group

## 2. Clone & Configure `.env.production`
```bash
sudo mkdir -p /opt/beauty-queen && sudo chown "$USER:$USER" /opt/beauty-queen
git clone https://github.com/mvasagan099/beauty-queen-E-commerce-main.git /opt/beauty-queen
cd /opt/beauty-queen

cp .env.example .env.production
chmod 600 .env.production
```

Generate cryptographic secrets and populate `.env.production`:
```bash
openssl rand -base64 48   # -> JWT_ACCESS_SECRET
openssl rand -base64 48   # -> JWT_REFRESH_SECRET
openssl rand -hex 24      # -> REDIS_PASSWORD
```

Minimum required production variables:
- `DATABASE_URL` (managed MySQL 8 or local Docker MySQL)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (distinct, 32+ chars)
- `RAZORPAY_KEY_ID` (`rzp_live_*`), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `BREVO_API_KEY`
- `REDIS_PASSWORD`
- `FRONTEND_URL=https://yourdomain.com`
- `NEXT_PUBLIC_API_URL=https://yourdomain.com/api`

Optional growth & scale integrations (already wired, gracefully disabled when unset):
- **GST Invoice Header:** `STORE_LEGAL_NAME`, `STORE_GSTIN`
- **Cloud Media (S3 / Cloudflare R2):** `MEDIA_STORAGE_DRIVER=s3`, `MEDIA_CDN_BASE_URL`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- **Shiprocket Courier:** `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_PINCODE`, `SHIPROCKET_WEBHOOK_TOKEN`
- **WhatsApp Business Cloud API:** `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
- **5xx Error Alerts:** `ALERT_WEBHOOK_URL` (Slack / Discord / PagerDuty webhook)

## 3. Configure Domain & TLS Certificate
1. Replace `YOUR-DOMAIN.com` in `docker/nginx/nginx.conf` with your live domain.
2. Issue Let's Encrypt certificates and place `fullchain.pem` and `privkey.pem` under `/etc/nginx/ssl/` (or mount your Certbot `/etc/letsencrypt/live/<domain>/` directory into the `nginx` service in `docker-compose.prod.yml`).

## 4. Pull Published GHCR Images & Start Services
```bash
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans

# Apply Prisma migrations
docker compose -f docker-compose.prod.yml exec -T api \
  npx prisma migrate deploy --schema=../../prisma/schema.prisma
```

## 5. Run Pre-Flight & Backup Verification
```bash
./scripts/preflight-check.sh .env.production https://yourdomain.com
bash scripts/backup.sh /var/backups/beauty-queen
```

Verify key production endpoints:
- `https://yourdomain.com/` — 3D Atelier storefront + Shade/Stylist Studio
- `https://yourdomain.com/api/health/ready` — MySQL + Redis readiness probe
- `https://yourdomain.com/api/metrics/prometheus` — Prometheus OpenMetrics scrape target
- `https://yourdomain.com/manifest.webmanifest` — Installable PWA manifest

## 6. Enable Automated GitHub Actions Deploys (Optional)
Once your server is ready, add these secrets under **GitHub Repository → Settings → Environments (`staging` / `production`)** so `.github/workflows/deploy.yml` automatically deploys every green `main` build:
- **Staging:** `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`, `STAGING_URL`
- **Production:** `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_URL`, `MYSQL_ROOT_PASSWORD`
