# syntax=docker/dockerfile:1
# Backend do ConversaExpress: build TypeScript e imagem enxuta só com o necessário.

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json .sequelizerc ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build --chown=node:node /app/package.json /app/.sequelizerc ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node docker ./docker
# Mídias enviadas, planilhas em importação e certificados (volumes no compose).
RUN mkdir -p public private/imports && chown -R node:node public private
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/version').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Sinais e processos órfãos: use `init: true` (o compose já usa) ou `docker run --init`.
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "dist/server.js"]
