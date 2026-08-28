# -- Build stage --
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy API package
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

# Install dependencies (including devDependencies for build)
RUN cd apps/api && npm ci

# Copy source
COPY apps/api ./apps/api
COPY prisma ./prisma

# Generate Prisma client
RUN cd apps/api && npx prisma generate --schema=../../prisma/schema.prisma

# Build
RUN cd apps/api && npm run build

# -- Production stage --
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

# Install production dependencies only
RUN cd apps/api && npm ci --omit=dev && npm cache clean --force

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma

# Create uploads directory
RUN mkdir -p /app/uploads/products /app/public

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health/live || exit 1

CMD ["node", "apps/api/dist/main.js"]
