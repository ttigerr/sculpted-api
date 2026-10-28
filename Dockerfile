# syntax=docker/dockerfile:1.7

# ---- deps ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Stub env for build. Real values are injected by Azure at runtime.
# Required because top-level module init (src/db/index.ts, src/lib/require-user.ts)
# reads these env vars when Next collects route metadata.
ENV DATABASE_URL="postgres://stub" \
    DATABASE_URL_UNPOOLED="postgres://stub" \
    AZURE_TENANT_NAME="stub" \
    AZURE_USER_SIGNIN_FLOW="stub" \
    AZURE_USER_SIGNUP_FLOW="stub" \
    AZURE_CLIENT_ID="stub" \
    B2C_ISSUER="https://stub"
RUN npm run build

# ---- runtime ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
 && adduser  -u 1001 -S nextjs -G nodejs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
