# Beauty Queen E-Commerce — Go-Live Checklist

> Final deployment checklist to be completed before production launch.
> Every item must be verified and checked off by the responsible engineer.

---

## Code

- [ ] CI pipeline passing on main branch
- [ ] All unit tests passing
- [ ] All lint checks passing
- [ ] TypeScript type checks passing
- [ ] Production build succeeds (API + Web)
- [ ] Docker images build successfully
- [ ] No TODO/FIXME comments in critical paths

---

## Security

- [ ] Production secrets configured (not default/dev values)
- [ ] JWT_ACCESS_SECRET >= 32 characters, unique per environment
- [ ] JWT_REFRESH_SECRET >= 32 characters, unique per environment
- [ ] Razorpay LIVE keys configured (not test keys)
- [ ] Razorpay webhook secret configured
- [ ] Brevo production API key configured
- [ ] HTTPS enabled and working
- [ ] HTTP -> HTTPS redirect configured
- [ ] CORS configured with explicit allowed origins
- [ ] Security headers configured (Helmet + Nginx)
- [ ] Admin role authorization verified
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] No secrets in git history or Docker images
- [ ] MySQL not publicly exposed
- [ ] Redis not publicly exposed

---

## Database

- [ ] MySQL production instance provisioned
- [ ] Database user has minimum required privileges
- [ ] Character encoding: utf8mb4
- [ ] Connection pooling configured
- [ ] Timezone set to UTC
- [ ] Prisma migrations current (`npx prisma migrate status`)
- [ ] Migration tested against clean database
- [ ] Backup created before migration
- [ ] Backup verified and restorable
- [ ] Restore tested in staging environment

---

## Infrastructure

- [ ] Docker Compose production file validated
- [ ] Nginx configuration validated
- [ ] SSL certificates installed and valid
- [ ] Health checks working for all services
- [ ] Redis working and authenticated
- [ ] BullMQ queues processing
- [ ] Worker health probe responding
- [ ] File upload volume mounted
- [ ] Resource limits appropriate
- [ ] Restart policies configured (`unless-stopped`)

---

## Payments

- [ ] Razorpay production credentials configured
- [ ] Razorpay webhook URL configured
- [ ] Webhook signature verification tested
- [ ] Duplicate webhook handling tested
- [ ] Payment failure handling tested
- [ ] Refund flow tested
- [ ] Test payment in production mode successful

---

## Email

- [ ] Brevo production API key configured
- [ ] Sender email verified in Brevo
- [ ] Order confirmation email tested
- [ ] Password reset email tested
- [ ] Abandoned cart email tested

---

## Monitoring

- [ ] Error tracking configured (Sentry or equivalent)
- [ ] Structured JSON logs working
- [ ] Log aggregation configured
- [ ] Health check monitoring configured
- [ ] Alert rules configured:
  - [ ] API down (health check failing)
  - [ ] High error rate (>5%)
  - [ ] High response time (>2s p95)
  - [ ] MySQL down
  - [ ] Redis down
  - [ ] Disk usage >80%
  - [ ] Memory usage >80%
  - [ ] BullMQ failed jobs > 0

---

## Recovery

- [ ] Rollback procedure documented and tested
- [ ] Backup procedure documented and tested
- [ ] Restore procedure documented and tested
- [ ] Disaster recovery plan documented
- [ ] Secrets backup configured

---

## CI/CD

- [ ] CI workflow passing
- [ ] Deploy workflow configured
- [ ] GitHub secrets configured:
  - [ ] STAGING_HOST
  - [ ] STAGING_USER
  - [ ] STAGING_SSH_KEY
  - [ ] STAGING_URL
  - [ ] PRODUCTION_HOST
  - [ ] PRODUCTION_USER
  - [ ] PRODUCTION_SSH_KEY
  - [ ] PRODUCTION_URL
  - [ ] MYSQL_ROOT_PASSWORD
- [ ] GitHub environments configured (staging, production)
- [ ] Environment protection rules set
