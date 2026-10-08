# ConversaExpress

O ConversaExpress é uma plataforma de atendimento via WhatsApp para equipes: tickets, filas, chatbots, campanhas, chat interno e muito mais, em um único painel multiempresa.

## 🚀 Começando

O repositório possui 3 pastas:
- **backend**: API em Express + TypeScript (Sequelize, Baileys, BullMQ, Socket.IO)
- **frontend**: interface em Next.js 16 + TypeScript + MUI 9
- **instalador**: scripts para instalação automática em servidores Ubuntu (pm2 + nginx)

A forma recomendada de implantar é com **[Docker](#-docker-recomendado)**. O instalador continua disponível
(veja **[Implantação](#-implanta%C3%A7%C3%A3o-em-produ%C3%A7%C3%A3o)**).

## 🧭 Modernização (2026)

O projeto passou por uma revisão completa de segurança e por uma modernização da stack, feita em fases,
cada uma em um PR revisado e com CI verde.

**Stack atual**
- **Backend:** Node.js 24, TypeScript 5.9, Express 4, Sequelize 6, BullMQ 6 (filas e agendadores no Redis),
  Baileys 6.7.24 e Socket.IO 4.
- **Frontend:** Next.js 16 (App Router, build standalone), React 19, MUI 9 e TypeScript, com a mesma marca e
  as mesmas cores do frontend antigo (pt, en e es).
- **Infraestrutura:** Postgres 17, Redis 7 e Docker Compose com Caddy (HTTPS automático). O instalador
  (pm2 + nginx) continua disponível.
- **CI (GitHub Actions):** backend (typecheck, testes e build), frontend (typecheck, lint, testes e build) e
  Docker (validação dos compose e build das imagens).

**Fases**

| Fase | O que mudou | PR |
| --- | --- | --- |
| 0 e 1 | Higiene do repositório, CI e correção das vulnerabilidades críticas e altas | [#1](https://github.com/alexander-mattos/conversaexpress-v2/pull/1) |
| 2a | Node 24, TypeScript 5.9 e dependências do backend atualizadas | [#2](https://github.com/alexander-mattos/conversaexpress-v2/pull/2) |
| 2b | Sequelize 6 e sequelize-typescript 2 | [#3](https://github.com/alexander-mattos/conversaexpress-v2/pull/3) |
| 2c | Filas no BullMQ com agendadores no Redis (e migração dos jobs do Bull) | [#4](https://github.com/alexander-mattos/conversaexpress-v2/pull/4) |
| 2d | Baileys 6.7.24 sem o store em memória | [#5](https://github.com/alexander-mattos/conversaexpress-v2/pull/5) |
| 3a | Novo frontend em Next.js: base, tema da marca, login, layout e Dashboard | [#6](https://github.com/alexander-mattos/conversaexpress-v2/pull/6) |
| 3b | Atendimento: lista de tickets, notificações, conversa e painel do contato | [#7](https://github.com/alexander-mattos/conversaexpress-v2/pull/7), [#8](https://github.com/alexander-mattos/conversaexpress-v2/pull/8) |
| 3c | Uso diário, filas e usuários, conexões e integrações, chat interno, informativos e Kanban | [#9](https://github.com/alexander-mattos/conversaexpress-v2/pull/9) a [#13](https://github.com/alexander-mattos/conversaexpress-v2/pull/13) |
| 3d | Campanhas, Configurações, Financeiro (Pix), Assinatura e API de mensagens | [#14](https://github.com/alexander-mattos/conversaexpress-v2/pull/14) a [#16](https://github.com/alexander-mattos/conversaexpress-v2/pull/16) |
| 3e | Cutover: o Next.js vira o único frontend (o antigo, em CRA, foi removido) | [#17](https://github.com/alexander-mattos/conversaexpress-v2/pull/17) |
| 4 | Docker Compose para produção (com Caddy) e desenvolvimento | [#18](https://github.com/alexander-mattos/conversaexpress-v2/pull/18) |

Cada tela migrada na Fase 3 trouxe junto a correção das falhas encontradas na API que ela usa.

**Segurança: o que foi corrigido (por categoria)**
- SQL injection em consultas montadas com texto do usuário.
- Execução de comandos no servidor pelo processamento de mídia (ffmpeg).
- Path traversal e uploads: cada tipo de arquivo tem pasta fixa, tipos permitidos e tamanho máximo;
  planilhas ficam fora da pasta pública e são apagadas depois de importadas.
- Isolamento entre empresas: registros de outra empresa (tickets, contatos, campanhas, listas, conexões,
  faturas etc.) são recusados em todas as rotas, inclusive em filtros e IDs vindos do corpo.
- Permissões por perfil (admin, atendente e super) e por recurso do plano, conferidas na API, e não só na tela.
- Segredos (chave da OpenAI, tokens e credenciais de integrações) nunca voltam pela API, pelo socket ou no login.
- URLs de integração não podem apontar para a rede interna do servidor (SSRF).
- Autenticação: access token só em memória, refresh em cookie httpOnly, socket autenticado no handshake,
  redefinição de senha com código de uso único e token da API de mensagens obrigatório.
- Limite de tentativas em login, redefinição de senha, cadastro e API de mensagens.
- Cobrança (Asaas): o valor vem da fatura no banco, e o webhook exige o token, confere o pagamento no Asaas e não paga duas vezes.

**Qualidade**
- Testes de segurança no backend (Jest) e testes unitários no frontend (Vitest), rodando no CI.
- Cada fase foi validada também com testes E2E (Playwright) contra o backend real.

**Ao atualizar uma instalação antiga**
- Rode as migrations (`npx sequelize db:migrate`), ou deixe o container do backend rodá-las.
- Apague os arquivos `contatos_*.txt` antigos (veja [Implantação](#-implanta%C3%A7%C3%A3o-em-produ%C3%A7%C3%A3o)).
- Numa instalação nova, troque a senha do `admin@admin.com` no primeiro acesso.

## 🐳 Docker (recomendado)

O `docker-compose.yml` da raiz sobe tudo: Postgres 17, Redis 7, backend, frontend e o
[Caddy](https://caddyserver.com/) na frente, com HTTPS automático (Let's Encrypt) para os dois domínios.
Banco e Redis ficam só na rede interna; apenas as portas 80 e 443 são publicadas.

### Produção
Pré-requisitos: Docker com o plugin compose, e o DNS dos dois domínios apontando para o servidor.
```
git clone <repositório> conversaexpress && cd conversaexpress
cp .env.docker.example .env      # preencha domínios, e-mail e senhas (openssl rand -hex 32)
docker compose up -d --build
```
- Na primeira subida, o backend roda as migrations, cria a empresa padrão e o usuário
  `admin@admin.com` / `123456` (**troque a senha no primeiro acesso**) e migra as filas antigas do Bull.
  Nas seguintes, só as migrations novas. `RUN_MIGRATIONS=false` desliga esse passo.
- Boas-vindas: ao criar uma empresa (cadastro público ou Configurações → Empresas), o sistema envia
  e-mail (se `MAIL_*` estiver preenchido) e WhatsApp pela conexão padrão da empresa `PLATFORM_COMPANY_ID`
  (padrão 1), com login, link e plano. A senha só vai quando foi gerada pelo sistema.
- Cobrança das empresas pelo Asaas (Pix, boleto e cartão): preencha `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`
  (`ASAAS_SANDBOX=true` para testar). No painel do Asaas, em Integrações → Webhooks, cadastre
  `https://<BACKEND_DOMAIN>/subscription/webhook` com o mesmo token e os eventos de cobrança.
- Valores com `$` no `.env` (como a chave do Asaas) vão entre aspas simples (`ASAAS_API_KEY='...'`)
  ou com cada `$` escrito como `$$`; sem isso o compose trata o `$` como variável e corta o valor.
- Logs: `docker compose logs -f backend`. Estado: `docker compose ps` (todos os serviços têm healthcheck).

Atualizar:
```
git pull
docker compose up -d --build
```
A URL do backend entra no build do frontend: se mudar `BACKEND_DOMAIN`, rode o `--build` de novo.

Backup (banco e mídias enviadas):
```
docker compose exec -T postgres pg_dump -U conversaexpress conversaexpress > backup.sql
docker run --rm -v conversaexpress_backend_public:/dados -v "$PWD":/destino busybox \
  tar czf /destino/midias.tgz -C /dados .
```

Testar localmente com HTTPS (sem certificado público): no `.env`, use
`FRONTEND_DOMAIN=app.conversa.localhost`, `BACKEND_DOMAIN=api.conversa.localhost` e
`CADDY_GLOBAL_OPTIONS=local_certs` (o navegador resolve qualquer `*.localhost` para a própria máquina).
Os dois domínios precisam ser do mesmo "site": `localhost` e `api.localhost` contam como sites diferentes,
e aí o cookie de sessão (`SameSite=Lax`) não é enviado e o F5 encerra a sessão. O Caddy cria uma autoridade
certificadora própria; para o navegador confiar nela (sem o aviso "Não seguro"), copie e instale o
certificado raiz:
```
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```
- Windows: abra o `caddy-root.crt` → Instalar Certificado → Máquina Local → "Autoridades de
  Certificação Raiz Confiáveis". Feche todas as janelas do navegador e abra de novo.
- Linux: `sudo cp caddy-root.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates`.
- Firefox usa a própria lista: Configurações → Certificados → Importar.

Com o WSL, instale no Windows (é onde o navegador roda). O certificado continua válido enquanto o
volume `caddy_data` existir.

### Desenvolvimento
```
docker compose -f docker-compose.dev.yml up
```
Frontend em http://localhost:3000, API em http://localhost:8080, Postgres em `localhost:5432` e
Redis em `localhost:6379` (usuário, senha e banco: `conversaexpress`). O código é montado do host:
o backend reinicia sozinho (ts-node-dev) e o frontend usa o `next dev`. O `npm ci` só roda na primeira
subida e quando o `package-lock.json` muda (`docker/dev-install.sh`); nas outras, o container inicia direto. Os dados ficam no volume
`pgdata_dev` (`docker compose -f docker-compose.dev.yml down -v` apaga tudo).

### 📋 Pré-requisitos

Para rodar sem Docker:
```
- Node.js 24 (LTS) e npm
- Postgres 13 ou mais novo
- Redis 6 ou mais novo
```
Com Docker, basta o Docker com o plugin compose (o Postgres 17 e o Redis 7 vêm no compose).

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

ASAAS_API_KEY=
ASAAS_SANDBOX=false
ASAAS_WEBHOOK_TOKEN=

# EMAIL
 MAIL_HOST="smtp.gmail.com"
 MAIL_USER="seu@gmail.com"
 MAIL_PASS="SuaSenha"
 MAIL_FROM="seu@gmail.com"
 MAIL_PORT="465"

```

#### .env.production frontend
As variáveis `NEXT_PUBLIC_*` entram no build: se mudar a URL do backend, rode `npm run build` de novo.
`PORT` é a porta usada pelo PM2 (`ecosystem.config.cjs`).
```
NEXT_PUBLIC_BACKEND_URL=${backend_url}
NEXT_PUBLIC_HOURS_CLOSE_TICKETS_AUTO=24
PORT=${frontend_port}
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
cp .env.example .env.local   # NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm run dev                  # http://localhost:3000
```

## ✅ Verificações (CI)

A cada push na `main` e em cada pull request, o GitHub Actions (`.github/workflows/ci.yml`) roda:
- **backend**: `npm run typecheck`, `npm run test:unit` e `npm run build` (o `npm run lint` roda em modo informativo)
- **frontend**: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`
- **docker**: valida os dois arquivos compose e faz o build das imagens do backend e do frontend

Para rodar localmente:
```
cd backend/ && npm run typecheck && npm run test:unit && npm run build
cd frontend/ && npm run typecheck && npm run lint && npm test && npm run build
```

## 🖥️ Frontend (Next.js)

`frontend/` é o frontend em Next.js 16 + TypeScript + MUI 9, migrado tela a tela a partir do antigo frontend
em React (CRA), que foi removido (continua no histórico do git).
Cores e marca são as mesmas (`src/theme/tokens.ts`; o teste `src/__tests__/theme.test.ts` falha se elas mudarem).

Telas:
- login, cadastro, esqueci a senha, layout (menu e barra superior) e Dashboard;
- atendimentos: lista de tickets (abas, filtros, busca, novo ticket), notificações com som,
  conversa (mensagens, envio de texto/arquivos/áudio/emoji, respostas rápidas, transferir, agendar, tags)
  e painel do contato (dados, edição e observações);
- uso diário: Contatos (com importação de planilha e exportação de todos em CSV), Respostas Rápidas,
  Tags, Agendamentos (calendário), Tarefas e Ajuda.
- configuração: Filas & Chatbot (com horários e opções do chatbot), Usuários, o Perfil no menu da conta,
  Conexões (com QR Code), Lista de arquivos, Integrações e Open.Ai.
- colaboração: Chat Interno (com o popover do topo), Informativos (com o popover do topo) e Kanban.
- campanhas: Campanhas (com relatório), Configurações de envio e Listas de Contatos (com importação de planilha).
- Configurações: Opções, Horários da empresa e, para o super, Empresas, Planos e Ajuda.
- Financeiro (faturas com pagamento por Pix), Assinatura e API de mensagens (documentação e testes de envio).
Endereços que não existem abrem uma página 404 com a marca.

Diferenças em relação ao frontend antigo:
- o access token fica **só em memória**, nunca no `localStorage`;
- ao recarregar a página, a sessão é renovada pelo cookie httpOnly de refresh;
- o socket envia o token no `auth` do handshake, e não mais na URL.
- as Tarefas ficam no navegador por usuário (`tasks:<empresa>:<usuário>`); a lista antiga (`tasks`, compartilhada
  por todos do computador) passa uma vez para o primeiro usuário que abrir a tela;
- excluir contatos e importar contatos (planilha ou telefone) passam a ser só para admin, também na API.
- criar, editar e excluir filas e opções do chatbot, e trocar o idioma da empresa, passam a ser só para admin
  (também na API);
- o Perfil (menu da conta) funciona para todos os perfis: cada usuário altera o próprio nome, e-mail e senha
  (`PUT /users/me`); perfil, filas e conexão continuam com o admin.
- a chave da OpenAI é só de escrita: nunca volta da API (nem em tickets, conexões ou sockets); em branco,
  a tela mantém a chave atual. O token da conexão (API de mensagens) só aparece para o admin;
- URLs de integração (n8n, webhook, typebot) não podem apontar para a rede interna do servidor
  (localhost, IPs privados, metadados da nuvem). Para liberar um host interno de propósito, use
  `INTEGRATION_ALLOWED_HOSTS` no `.env` do backend (lista separada por vírgula, ex.: `n8n.local,10.0.0.5`).
- os eventos do Chat Interno vão só para os participantes do chat (antes iam para toda a empresa); só
  participantes leem e postam, e só o dono edita ou apaga o chat;
- os Informativos inativos só aparecem para o super admin; a mídia do informativo aceita só imagem
  (png, jpg, jpeg, webp) e o "lido" do popover fica no navegador por usuário.
- Kanban: cada ticket fica em uma só coluna (a primeira tag de kanban; sem tag de kanban, "Em aberto",
  mesmo com tags comuns). Mover troca só a tag de kanban (`PUT /ticket-tags/:ticketId/kanban`) e mantém
  as comuns. O atendente vê só os tickets dele e os pendentes das filas dele (`showAll` vale só para admin),
  só move esses tickets, e a tela e a API exigem o Kanban no plano.
- Campanhas: a API exige campanhas no plano (ou `campaignsEnabled` da empresa); criar, editar, disparar,
  configurar e importar listas é só para admin (o atendente só vê). A campanha só aceita conexão, lista,
  tag e lista de arquivos da própria empresa; status, mídia e empresa nunca vêm do formulário. A mídia
  fica em `public/campaigns/<id>/` (só imagem, vídeo, áudio ou PDF). A importação de contatos aceita
  `.xlsx` e `.csv` (o `.xls` antigo não), lida pela `read-excel-file`, e a planilha é apagada do
  servidor depois de importada (fica em `backend/private/imports` só durante a importação).
- Configurações: as credenciais das integrações (Asaas, IXC, MK-AUTH) são só de escrita (em branco
  mantém a atual) e não voltam mais na API, no socket nem no login; o atendente só recebe as opções
  públicas. Só chaves conhecidas com os valores dos selects são aceitas; `campaignsEnabled` é só do
  super; os endereços do IXC e do MK-AUTH precisam ser URL http(s) externa (o mesmo bloqueio de rede
  interna das integrações, conferido de novo antes de cada chamada). Horários da empresa só para admin.
- Pagamento: o checkout com endereço e cartão (que o backend ignorava) virou um Pix por fatura (QR Code e
  copia-e-cola); a tela fecha sozinha quando o Pix é confirmado pelo webhook.
- API de mensagens (`POST /api/messages/send`): token vazio ou ausente é recusado (conexões sem token
  passam a ter `token = null`; a migration converte os antigos `""`), exige a API externa no plano, valida
  número e texto e tem limite de 60 envios por minuto por token.

Produção (servidor standalone, Node 24): `npm run build` gera `.next/standalone` e já copia `public/` e
`.next/static` para dentro dele (`scripts/standalone-assets.mjs`).
```
cd frontend/
npm ci
npm run build
PORT=3000 npm start                     # node .next/standalone/server.js
# ou com PM2 (porta lida do .env.production):
PM2_APP_NAME=empresa-frontend pm2 start ecosystem.config.cjs
```

Para aceitar outro endereço de frontend (homologação, por exemplo), adicione-o em `FRONTEND_EXTRA_ORIGINS`
no `.env` do backend (lista separada por vírgula, para CORS e socket).

## 📦 Implantação em produção

**Atenção (segurança):** versões anteriores gravavam os contatos do celular em `backend/public/contatos_antes.txt`
e `backend/public/contatos_depois.txt`, acessíveis pela URL pública do backend. A versão atual não grava mais esses
arquivos; apague os existentes em cada instalação:
```
rm -f backend/public/contatos_antes.txt backend/public/contatos_depois.txt
```

Para correta implantação é necessário realizar uma atualização do código fonte da aplicação e criar novamente os arquivos da pasta dist/

Atenção: é necessário acessar utilizando o usuário de deploy

```
su - deploy
```

**Saindo do frontend antigo (CRA):** a opção "atualizar" do instalador já faz a troca. Ela cria o
`frontend/.env.production` a partir do `.env` e do `server.js` antigos (URL do backend e porta), apaga
`build/`, `server.js` e `.env`, e registra o processo do PM2 com o `ecosystem.config.cjs`. Para fazer à mão:
```
cd /home/deploy/${empresa_atualizar}
pm2 delete ${empresa_atualizar}-frontend
git pull
cd /home/deploy/${empresa_atualizar}/frontend
# só na primeira vez (ajuste a URL do backend e a porta antigas):
printf 'NEXT_PUBLIC_BACKEND_URL=%s\nNEXT_PUBLIC_HOURS_CLOSE_TICKETS_AUTO=24\nPORT=%s\n' https://api.seudominio.com 3000 > .env.production
rm -rf build server.js .env
npm ci
npm run build
PM2_APP_NAME=${empresa_atualizar}-frontend pm2 start ecosystem.config.cjs
pm2 save
```

Nas atualizações seguintes:
```
cd /home/deploy/${empresa_atualizar}
git pull
cd /home/deploy/${empresa_atualizar}/frontend
npm ci
npm run build
pm2 restart ${empresa_atualizar}-frontend
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

* [Express](https://expressjs.com/pt-br/), [Sequelize](https://sequelize.org/) e [BullMQ](https://docs.bullmq.io/) - Backend
* [PostgreSQL](https://www.postgresql.org/) e [Redis](https://redis.io/) - Banco de dados e filas
* [Next.js](https://nextjs.org/) e [MUI](https://mui.com/) - Frontend
* [Docker](https://www.docker.com/) e [Caddy](https://caddyserver.com/) - Implantação
* [Baileys](https://github.com/WhiskeySockets/Baileys) - Conexão com o WhatsApp
* [NPM](https://www.npmjs.com/) - Gerenciador de dependências

Baseado no projeto open source Whaticket/Atendechat.

## 📄 Licença

Este projeto está sob a licença MIT.

⌨️ com ❤️ por ConversaExpress
