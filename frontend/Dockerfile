# syntax=docker/dockerfile:1
# Frontend Next.js (standalone). As NEXT_PUBLIC_* entram no build.

FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_HOURS_CLOSE_TICKETS_AUTO=24
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_HOURS_CLOSE_TICKETS_AUTO=$NEXT_PUBLIC_HOURS_CLOSE_TICKETS_AUTO \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# O postbuild copia public/ e .next/static para dentro de .next/standalone.
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
