# Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20+ (for local development)
- MySQL 8.0+
- Redis 7+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt or cloud provider)

## Architecture

```
Internet → HTTPS → Next.js (port 3000) → API proxy → NestJS (port 5000)
                                                    ↓
                                              MySQL + Redis
                                                    ↓
                                              BullMQ Worker
                                                    ↓
                                              Brevo (email)
```

## Production Deployment

### 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repository
git clone <repo-url> /var/www/beauty-queen
cd /var/www/beauty-queen
```

### 2. Environment Configuration

```bash
cp .env.example .env

# Generate JWT secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# Edit .env with production values
# Set all required variables including Razorpay and Brevo keys
```

### 3. Build and Start

```bash
# Build all services
docker-compose up -d --build

# Verify all services are healthy
docker-compose ps

# Check API health
curl http://localhost:5000/api/health
```

### 4. Database Setup

```bash
# Run Prisma migrations
docker-compose exec api npx prisma migrate deploy

# Optional: Seed database
docker-compose exec api npx prisma db seed
```

### 5. Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

### 6. Razorpay Webhook

Configure in Razorpay Dashboard:
- URL: `https://api.example.com/api/payments/webhook`
- Events: `payment.captured`, `payment.failed`

### 7. SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d example.com -d api.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| web | 3000 | Next.js frontend |
| api | 5000 | NestJS API |
| worker | - | BullMQ worker (no exposed port) |
| mysql | 3306 | MySQL database |
| redis | 6379 | Redis cache/queue |

## Health Checks

```bash
# Full health check (DB + Redis)
curl http://localhost:5000/api/health

# Liveness probe (always returns 200)
curl http://localhost:5000/api/health/live

# Readiness probe (checks DB connectivity)
curl http://localhost:5000/api/health/ready
```

## Monitoring

### Application Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f web
```

### Key Metrics to Monitor

- API response times
- Error rates (5xx responses)
- Database connection pool
- Redis memory usage
- BullMQ queue depth
- Failed email jobs
- Payment failures

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
  worker:
    deploy:
      replicas: 2
```

### Database Scaling

- Use MySQL read replicas for read-heavy operations
- Connection pooling via Prisma

## Backup Strategy

See [BACKUP-RESTORE.md](BACKUP-RESTORE.md)

## Rollback Procedure

1. **Application rollback**: Redeploy previous Docker image
2. **Database rollback**: Restore from backup only if schema changed
3. **Verification**: Run smoke tests after rollback

```bash
# Rollback to previous version
docker-compose down
docker-compose up -d --build api=previous-tag
```

## Maintenance

### Update Dependencies

```bash
# Update API dependencies
cd apps/api && npm update

# Update Web dependencies
cd apps/web && npm update

# Rebuild containers
docker-compose up -d --build
```

### Database Maintenance

```bash
# Prisma migration status
docker-compose exec api npx prisma migrate status

# Reset database (WARNING: deletes data)
docker-compose exec api npx prisma migrate reset
```
