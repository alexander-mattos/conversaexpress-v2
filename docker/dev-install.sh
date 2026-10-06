#!/bin/sh
# Modo dev (docker-compose.dev.yml): roda o npm ci só quando o package-lock.json
# muda. O hash fica gravado no volume de node_modules; nas outras subidas o
# container inicia direto.
set -e
hash=$(sha1sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.lock-sha1 2>/dev/null)" = "$hash" ]; then
  echo "[dev] dependências em dia: npm ci pulado"
else
  npm ci --no-audit --no-fund
  echo "$hash" > node_modules/.lock-sha1
fi
