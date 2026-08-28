# -- Build stage --
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

RUN cd apps/api && npm ci

COPY apps/api ./apps/api
COPY prisma ./prisma

RUN cd apps/api && npx prisma generate --schema=../../prisma/schema.prisma
RUN cd apps/api && npm run build

# -- Production stage --
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

RUN cd apps/api && npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health/live || exit 1

CMD ["node", "apps/api/dist/worker.js"]
