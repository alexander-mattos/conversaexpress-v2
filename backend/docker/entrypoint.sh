#!/bin/sh
# Prepara o banco antes de iniciar o backend no container.
#   RUN_MIGRATIONS=false  pula migrations, seed e migração das filas.
set -e

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  node docker/db-wait.js
  npx sequelize db:migrate
  # Só num banco novo: cria a empresa, o usuário admin e as configurações padrão.
  if node docker/db-wait.js --is-empty; then
    echo "[entrypoint] banco vazio: rodando os seeds"
    npx sequelize db:seed:all
  fi
  # Move jobs do Bull antigo para o BullMQ (idempotente).
  node dist/scripts/migrateBullJobs.js
fi

exec "$@"
