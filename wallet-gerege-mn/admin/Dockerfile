# syntax=docker/dockerfile:1.7
#
# wallet.gerege.mn/admin — super-admin frontend (Next.js 14 standalone, BFF).
# Browser нь зөвхөн энэ Next service-тэй ярина; admin API (cmd/admin) руу
# server талаас ADMIN_API_URL-аар хандана (токен httpOnly cookie).

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# lockfile байвал npm ci (reproducible), эс бөгөөс npm install. typescript peer
# зөрчлийн улмаас resolver гацахаас сэргийлж --legacy-peer-deps (peer SAT алгасна).
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps --no-audit --no-fund; fi

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3010
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3010
CMD ["node", "server.js"]
