# Docker & Deploy em 1 Clique (Pilar 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fornecer empacotamento completo em contêineres Docker (MariaDB 11.4 LTS + FastAPI Backend + Nginx/React Frontend) e scripts automatizados de deploy em 1 clique para Windows e Linux/macOS.

**Architecture:** Três serviços orquestrados via Docker Compose em rede privada com volumes persistentes para MariaDB, proxy reverso Nginx servindo o frontend SPA e roteando `/api/` para o FastAPI, healthchecks em cascata e scripts de auto-provisionamento com seed inicial.

**Tech Stack:** Docker, Docker Compose, MariaDB 11.4 LTS, Python 3.12-slim, FastAPI, Uvicorn, Nginx 1.27 Alpine, Node.js 20 Alpine, Vite, Bash, PowerShell.

**Spec:** `docs/superpowers/specs/2026-10-12-docker-and-deployment-design.md`

## Global Constraints

- Backend Dockerfile deve rodar com usuário não-root `appuser`.
- Frontend deve usar multi-stage build (Node.js 20 -> Nginx 1.27 Alpine) com suporte a roteamento SPA (`try_files $uri /index.html`).
- O Nginx deve fazer proxy transparente de `/api/`, `/health`, `/docs` e `/openapi.json` para o backend.
- O banco de dados MariaDB deve usar volume persistente nomeado `mariadb_data` e charset UTF8MB4.
- Orquestração via `docker-compose.yml` deve usar healthchecks rigorosos para garantir inicialização sem falhas de conexão.
- Scripts de deploy (`deploy.sh` e `deploy.ps1`) devem ser idempotentes, gerar `.env` se ausente e inicializar tudo em 1 clique.

## Review Focus

- O backend aguarda a prontidão do MariaDB antes de iniciar o Uvicorn sem falhar por connection refused.
- O Nginx resolve corretamente o nome do serviço `backend` na rede Docker interna.
- O roteamento SPA do frontend não retorna 404 ao recarregar a página em qualquer rota.
- O volume de dados do MariaDB preserva clientes, agendamentos e transações ao derrubar e recriar os contêineres.
- O script de deploy funciona em ambientes Windows e Linux sem requerer passos manuais adicionais.

---

### Task 1: Backend Dockerfile, Entrypoint e Healthcheck

**Files:**
- Create: `docker/backend.Dockerfile`
- Create: `docker/entrypoint.sh`
- Create: `.dockerignore`

**Interfaces:**
- Produces: Imagem Docker do backend expondo porta 8000 com healthcheck `/health` e script de entrypoint que aguarda o banco e executa migrações/seed.

- [ ] **Step 1: Create `.dockerignore`**

Ignorar arquivos desnecessários (`.git`, `__pycache__`, `node_modules`, `frontend/dist`, etc.).

- [ ] **Step 2: Create `docker/entrypoint.sh`**

Script bash que aguarda o banco de dados estar disponível, inicializa as tabelas do SQLAlchemy se necessário, roda `seed.py` se `AUTO_SEED=true`, e executa o comando `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

- [ ] **Step 3: Create `docker/backend.Dockerfile`**

Dockerfile multi-etapa ou limpo baseado em `python:3.12-slim`, instalando dependências de `requirements.txt`, criando usuário `appuser` e definindo `HEALTHCHECK`.

- [ ] **Step 4: Build and test backend image locally**

Run: `docker build -t softbarber-backend:test -f docker/backend.Dockerfile .`  
Expected: Build concluído com sucesso (exit code 0).

- [ ] **Step 5: Commit**

```bash
git add docker/backend.Dockerfile docker/entrypoint.sh .dockerignore
git commit -m "feat(docker): create backend Dockerfile, entrypoint script and dockerignore"
```

---

### Task 2: Frontend Dockerfile Multi-stage e Configuração Nginx

**Files:**
- Create: `docker/frontend.Dockerfile`
- Create: `docker/nginx.conf`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Produces: Imagem Docker do frontend em Nginx servindo o SPA construído na raiz `/` e fazendo proxy reverso para `http://backend:8000` em `/api/`, `/health` e `/docs`.

- [ ] **Step 1: Create `frontend/.dockerignore`**

Ignorar `node_modules`, `dist`, `.git`, arquivos de log.

- [ ] **Step 2: Create `docker/nginx.conf`**

Configurar Nginx com:
- Gzip ativado para tipos mime comuns.
- SPA fallback: `try_files $uri $uri/ /index.html;`
- Proxy reverso para `http://backend:8000` para `/api/`, `/health`, `/docs`, `/openapi.json`.
- Cabeçalhos de segurança HTTP.

- [ ] **Step 3: Create `docker/frontend.Dockerfile`**

Multi-stage build:
- Stage 1: `node:20-alpine`, `npm ci`, `npm run build`.
- Stage 2: `nginx:1.27-alpine`, cópia de `/app/dist` para `/usr/share/nginx/html`, cópia de `docker/nginx.conf`.

- [ ] **Step 4: Build frontend image locally**

Run: `docker build -t softbarber-frontend:test -f docker/frontend.Dockerfile .`  
Expected: Build concluído com sucesso (exit code 0).

- [ ] **Step 5: Commit**

```bash
git add docker/frontend.Dockerfile docker/nginx.conf frontend/.dockerignore
git commit -m "feat(docker): create multi-stage frontend Dockerfile and Nginx reverse proxy"
```

---

### Task 3: Docker Compose e Orquestração Multi-serviço com MariaDB

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `app/core/config.py` (se necessário para assegurar suporte a variáveis de ambiente de banco e porta)

**Interfaces:**
- Produces: Pilha completa orquestrada com serviços `db` (MariaDB 11.4), `backend` e `frontend`, rede `softbarber_network`, volume `mariadb_data`, e healthchecks encadeados.

- [ ] **Step 1: Create `.env.example`**

Definir variáveis padrão recomendadas para execução em contêineres e produção.

- [ ] **Step 2: Create `docker-compose.yml`**

Configurar serviços `db`, `backend`, `frontend`, redes, volumes e healthchecks encadeados.

- [ ] **Step 3: Test docker compose stack execution**

Testar sintaxe e validação:
Run: `docker compose config`  
Expected: Configuração válida sem erros de sintaxe.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat(docker): implement docker-compose configuration for MariaDB, backend and frontend"
```

---

### Task 4: Scripts de Deploy em 1 Clique e Documentação de Produção

**Files:**
- Create: `deploy.sh`
- Create: `deploy.ps1`
- Create: `docs/deploy.md`
- Modify: `README.md`

**Interfaces:**
- Produces: Scripts executáveis de inicialização automática em 1 clique para Linux/macOS e Windows, guia completo de deploy em produção e atualização do README.

- [ ] **Step 1: Create `deploy.sh`**

Script POSIX/Bash com checagem de Docker, geração de `.env`, `docker compose up -d --build`, polling de healthcheck e exibição de resumo do sistema.

- [ ] **Step 2: Create `deploy.ps1`**

Script PowerShell com a mesma lógica e tratamento amigável de erros para Windows.

- [ ] **Step 3: Create `docs/deploy.md`**

Guia completo de deploy cobrindo:
- Deploy local com Docker Compose.
- Deploy em VPS / Nuvem (Hetzner, DigitalOcean, AWS, Linode).
- Configuração de HTTPS / SSL com Caddy ou Nginx Certbot.
- Backup e Restauração de dados do MariaDB.
- Variáveis de ambiente e segurança.

- [ ] **Step 4: Update `README.md`**

README completo e profissional com apresentação do SoftBarber, badges, arquitetura, início rápido em 1 clique, credenciais padrão e comandos de desenvolvimento.

- [ ] **Step 5: Test deploy script and verify running stack**

Testar execução dos contêineres e verificar resposta em `http://localhost/health` e `http://localhost/`.

- [ ] **Step 6: Commit and Push**

```bash
git add deploy.sh deploy.ps1 docs/deploy.md README.md
git commit -m "feat(deploy): implement 1-click deploy scripts, documentation and README"
```
