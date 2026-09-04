# Production URLs

**Version:** v2.0.0
**Created:** 2026-09-04
**Status:** NOT YET CONFIGURED — No DNS/SSL setup performed

---

## Expected Production URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | https://YOUR-DOMAIN.com | NOT CONFIGURED |
| Frontend (www) | https://www.YOUR-DOMAIN.com | NOT CONFIGURED |
| Backend API | https://YOUR-DOMAIN.com/api | NOT CONFIGURED |
| API Health | https://YOUR-DOMAIN.com/api/health | NOT CONFIGURED |
| API Health (live) | https://YOUR-DOMAIN.com/api/health/live | NOT CONFIGURED |
| API Health (ready) | https://YOUR-DOMAIN.com/api/health/ready | NOT CONFIGURED |
| Worker Health | http://localhost:5001/api/health (internal) | NOT DEPLOYED |

## Architecture

```
Internet
   |
 HTTPS (443)
   |
Nginx Reverse Proxy
   |
   +----> Next.js (port 3000) -- static + SSR pages
   |
   +----> NestJS API (port 5000) -- /api/* routes
   |
   +----> Static uploads -- /uploads/*
```

## Configuration Required

### DNS Records

```
A     @          → <production-server-ip>
A     www        → <production-server-ip>
A     api        → <production-server-ip>  (if using separate subdomain)
```

### .env.production Values

```
FRONTEND_URL=https://YOUR-DOMAIN.com
NEXT_PUBLIC_API_URL=https://YOUR-DOMAIN.com/api
APP_DOMAIN=YOUR-DOMAIN.com
APP_WWW_DOMAIN=www.YOUR-DOMAIN.com
API_DOMAIN=api.YOUR-DOMAIN.com
```

### SSL Certificate

Place SSL certificate files at:
```
docker/nginx/ssl/cert.pem
docker/nginx/ssl/key.pem
```

Or use Let's Encrypt with certbot.
