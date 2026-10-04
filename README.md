# ConversaExpress

O ConversaExpress é uma plataforma de atendimento via WhatsApp para equipes: tickets, filas, chatbots, campanhas, chat interno e muito mais, em um único painel multiempresa.

## 🚀 Começando

O repositório possui 3 pastas:
- **backend**: API em Express + TypeScript (Sequelize, Baileys, Bull, Socket.IO)
- **frontend**: interface em React
- **instalador**: scripts para instalação automática em servidores Ubuntu

Consulte **[Implantação](#-implanta%C3%A7%C3%A3o-em-produ%C3%A7%C3%A3o)** para saber como implantar o projeto.

### 📋 Pré-requisitos

```
- Node.js v24.x (LTS)
- Postgres (release)
- Npm ( latest )
- Docker (bionic stable)
- Redis
```

### 🔧 Instalação

Para iniciar a instalação do projeto é necessário ter todas as ferramentas de pré-requisitos disponíveis para uso

#### Redis
```
- su - root
- docker run --name redis-${instancia_add} -p ${redis_port}:6379 --restart always --detach redis redis-server --requirepass ${root_password}
```

#### Postgres
```
- sudo su - postgres
- createdb ${instancia_add};
- psql
- CREATE USER ${instancia_add} SUPERUSER INHERIT CREATEDB CREATEROLE;
- ALTER USER ${instancia_add} PASSWORD '${root_password}';
```

#### .env backend
```
NODE_ENV=
BACKEND_URL=${backend_url}
FRONTEND_URL=${frontend_url}
PROXY_PORT=443
PORT=${backend_port}

DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=${instancia_add}
DB_PASS=${mysql_root_password}
DB_NAME=${instancia_add}

JWT_SECRET=${jwt_secret}
JWT_REFRESH_SECRET=${jwt_refresh_secret}

REDIS_URI=redis://:${mysql_root_password}@127.0.0.1:${redis_port}
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

USER_LIMIT=${max_user}
CONNECTIONS_LIMIT=${max_whats}
CLOSED_SEND_BY_ME=true

GERENCIANET_SANDBOX=false
GERENCIANET_CLIENT_ID=Client_Id_Gerencianet
GERENCIANET_CLIENT_SECRET=Client_Secret_Gerencianet
GERENCIANET_PIX_CERT=certificado-Gerencianet
GERENCIANET_PIX_KEY=chave pix gerencianet

# EMAIL
 MAIL_HOST="smtp.gmail.com"
 MAIL_USER="seu@gmail.com"
 MAIL_PASS="SuaSenha"
 MAIL_FROM="seu@gmail.com"
 MAIL_PORT="465"

```

#### .env frontend
```
REACT_APP_BACKEND_URL=${backend_url}
REACT_APP_HOURS_CLOSE_TICKETS_AUTO = 24
```

#### Instalando dependências
Os dois projetos têm `package-lock.json`; use `npm ci` para instalar exatamente as versões testadas.
```
cd backend/
npm ci
cd frontend/
npm ci
```

### Rodando localmente
```
cd backend/
npm run watch
npm start

cd frontend/
npm start
```

## ✅ Verificações (CI)

A cada push na `main` e em cada pull request, o GitHub Actions (`.github/workflows/ci.yml`) roda:
- **backend**: `npm run typecheck`, `npm run test:unit` e `npm run build` (o `npm run lint` roda em modo informativo)
- **frontend**: `npm run build`
- **frontend-next**: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`

Para rodar localmente:
```
cd backend/ && npm run typecheck && npm run test:unit && npm run build
cd frontend/ && npm run build
cd frontend-next/ && npm run typecheck && npm run lint && npm test && npm run build
```

## 🧪 frontend-next (em migração)

`frontend-next/` é o novo frontend em Next.js 16 + TypeScript + MUI 9, migrado tela a tela.
O `frontend/` atual continua sendo o oficial até a migração terminar.
Cores e marca são as mesmas (`src/theme/tokens.ts`; o teste `src/__tests__/theme.test.ts` falha se elas mudarem).

Já migrado: login, cadastro, esqueci a senha, layout (menu e barra superior) e Dashboard.
As demais telas aparecem no menu e abrem uma página "em migração" com link para a mesma tela no frontend atual.

Diferenças em relação ao frontend atual:
- o access token fica **só em memória**, nunca no `localStorage`;
- ao recarregar a página, a sessão é renovada pelo cookie httpOnly de refresh;
- o socket envia o token no `auth` do handshake, e não mais na URL.

`.env` (copie de `.env.example`; as variáveis `NEXT_PUBLIC_*` entram no build):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_HOURS_CLOSE_TICKETS_AUTO=24
# endereço do frontend atual, usado nos links das telas ainda não migradas
NEXT_PUBLIC_LEGACY_URL=http://localhost:3000
```

Desenvolvimento e produção (servidor standalone, Node 24):
```
cd frontend-next/
npm install
npm run dev

npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
PORT=3000 node .next/standalone/server.js
```

Para usar os dois frontends ao mesmo tempo (homologação), mantenha o `FRONTEND_URL` do backend no frontend atual
e adicione o endereço do frontend-next em `FRONTEND_EXTRA_ORIGINS` (lista separada por vírgula, para CORS e socket).

## 📦 Implantação em produção

Para correta implantação é necessário realizar uma atualização do código fonte da aplicação e criar novamente os arquivos da pasta dist/

Atenção: é necessário acessar utilizando o usuário de deploy

```
su - deploy
```

```
cd /home/deploy/${empresa_atualizar}
pm2 stop ${empresa_atualizar}-frontend
git pull
cd /home/deploy/${empresa_atualizar}/frontend
npm ci
rm -rf build
npm run build
pm2 start ${empresa_atualizar}-frontend
pm2 save
```

```
cd /home/deploy/${empresa_atualizar}
pm2 stop ${empresa_atualizar}-backend
git pull
cd /home/deploy/${empresa_atualizar}/backend
npm ci
rm -rf dist
npm run build
npx sequelize db:migrate
# Move jobs pendentes do Bull antigo para o BullMQ (idempotente)
npm run queues:migrate
pm2 start ${empresa_atualizar}-backend
pm2 save 
```

## 🛠️ Construído com

* [Express](https://expressjs.com/pt-br/) - O framework backend usado
* [React](https://react.dev/) - Framework frontend usado
* [Baileys](https://github.com/WhiskeySockets/Baileys) - Conexão com o WhatsApp
* [NPM](https://www.npmjs.com/) - Gerenciador de dependências

Baseado no projeto open source Whaticket/Atendechat.

## 📄 Licença

Este projeto está sob a licença MIT.

⌨️ com ❤️ por ConversaExpress
