# Especificação Técnica: Docker & Deploy em 1 Clique (Pilar 1)

**Data:** 12 de Outubro de 2026  
**Status:** APROVADO  
**Contexto:** SoftBarber - Sistema de Gestão e Agendamento para Barbearias  

---

## 1. Visão Geral e Objetivos

O objetivo deste pilar é fornecer empacotamento completo em contêineres e um processo de implantação (*deploy*) em **1 clique** para o SoftBarber, permitindo que a aplicação seja instalada e colocada em produção em qualquer servidor Linux, macOS ou Windows em poucos minutos.

### Objetivos Principais
1. **Empacotamento Completo:**
   - Contêiner de Banco de Dados: MariaDB 11.4 LTS com volume persistente e charset `utf8mb4`.
   - Contêiner Backend: Imagem Python 3.12-slim com FastAPI, Uvicorn, dependências instaladas, healthcheck HTTP e script de inicialização resiliente.
   - Contêiner Frontend: Multi-stage build com Node.js 20 para compilação do Vite/React e Nginx 1.27 Alpine para servir os arquivos estáticos com proxy reverso integrado e compressão gzip.
2. **Orquestração Declarativa:**
   - Arquivo `docker-compose.yml` orquestrando os 3 serviços com rede isolada, healthchecks encadeados (`depends_on: condition: service_healthy`), variáveis de ambiente e reinicialização automática (`restart: unless-stopped`).
3. **Deploy em 1 Clique:**
   - Scripts automatizados `deploy.sh` (Bash/Linux/macOS) e `deploy.ps1` (PowerShell/Windows) que verificam pré-requisitos, inicializam o arquivo `.env`, sobem os contêineres, aguardam a prontidão dos serviços, executam o seed do banco de dados (se necessário) e exibem os links de acesso e credenciais padrão.
4. **Documentação de Produção:**
   - `docs/deploy.md` e `README.md` detalhando pré-requisitos, variáveis de ambiente, instruções para VPS/cloud, configuração de SSL/TLS (HTTPS) e rotina de backup/restore do banco MariaDB.

---

## 2. Arquitetura de Contêineres

```mermaid
graph TD
    User([Usuário / Navegador / PWA]) -->|Porta 80 / 443| Nginx[Frontend: Nginx 1.27 Alpine]
    
    subgraph Docker Network [softbarber_network]
        Nginx -->|/ (Arquivos Estáticos SPA)| Static[React 18 SPA Dist]
        Nginx -->|/api/* & /health & /docs| Backend[Backend: FastAPI + Uvicorn]
        Backend -->|Porta 3306 (SQLAlchemy)| DB[(MariaDB 11.4 LTS)]
    end

    subgraph Volumes Persistentes
        DB --> MariaDBData[(mariadb_data)]
    end
```

### 2.1. Serviços do Docker Compose

| Serviço | Imagem / Build | Portas Expostas | Healthcheck | Dependência |
|---|---|---|---|---|
| **db** | `mariadb:11.4` | `3306:3306` (host configurável) | `mariadb-admin ping` | - |
| **backend** | `docker/backend.Dockerfile` | `8000:8000` | `curl -f http://localhost:8000/health` | `db` (healthy) |
| **frontend** | `docker/frontend.Dockerfile` | `80:80` (host configurável: `APP_PORT`) | `curl -f http://localhost/health` | `backend` (healthy) |

---

## 3. Especificação dos Componentes

### 3.1. Backend Dockerfile (`docker/backend.Dockerfile`)
- **Base:** `python:3.12-slim`
- **Otimização de Camadas:**
  - Instalação de utilitários mínimos (`curl` para healthcheck, bibliotecas para compilação C se necessário).
  - Cópia isolada de `requirements.txt` e execução de `pip install --no-cache-dir -r requirements.txt`.
  - Cópia do código-fonte: `app/`, `seed.py`.
- **Segurança:** Criação de usuário não-root `appuser` (UID 1000).
- **Healthcheck:**
  - `CMD curl -f http://localhost:8000/health || exit 1`
  - Interval: 10s, Timeout: 5s, Retries: 5, Start Period: 10s.
- **Entrypoint (`docker/entrypoint.sh`):**
  - Aguarda o MariaDB estar acessível via script embutido ou socket.
  - Criação automática de tabelas via SQLAlchemy se não existirem.
  - Execução de seed se a variável `AUTO_SEED=true` estiver ativa e o banco estiver vazio.
  - Inicialização do `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

### 3.2. Frontend Dockerfile (`docker/frontend.Dockerfile`) & Nginx (`docker/nginx.conf`)
- **Estágio 1 (Build):**
  - Imagem `node:20-alpine`.
  - Instalação de dependências via `npm ci` ou `npm install`.
  - Compilação dos assets com `npm run build` gerando `/app/dist`.
- **Estágio 2 (Produção):**
  - Imagem `nginx:1.27-alpine`.
  - Cópia do diretório `/app/dist` para `/usr/share/nginx/html`.
  - Configuração do Nginx:
    * `try_files $uri $uri/ /index.html;` para suporte total a rotas SPA.
    * Gzip ativado para arquivos JS, CSS, SVG, JSON e fontes.
    * Proxy reverso transparente:
      ```nginx
      location /api/ {
          proxy_pass http://backend:8000/api/;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
      location /health {
          proxy_pass http://backend:8000/health;
      }
      location /docs {
          proxy_pass http://backend:8000/docs;
      }
      location /openapi.json {
          proxy_pass http://backend:8000/openapi.json;
      }
      ```
    * Cabeçalhos de segurança HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

### 3.3. Configuração de Ambiente (`.env.example`)
Variáveis padronizadas e documentadas:
- `MARIADB_HOST=db`
- `MARIADB_PORT=3306`
- `MARIADB_DATABASE=softbarber`
- `MARIADB_USER=softbarber`
- `MARIADB_PASSWORD=softbarber_secret`
- `MARIADB_ROOT_PASSWORD=softbarber_root_secret`
- `DATABASE_URL=mysql+pymysql://softbarber:softbarber_secret@db:3306/softbarber`
- `JWT_SECRET=generate_your_random_secret_here`
- `JWT_ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=1440`
- `DEFAULT_ADMIN_PIN=1234`
- `APP_PORT=80`
- `BACKEND_PORT=8000`
- `AUTO_SEED=true`

### 3.4. Scripts de Deploy em 1 Clique (`deploy.sh` & `deploy.ps1`)
O script realiza automaticamente o fluxo:
1. Valida se Docker e Docker Compose estão instalados.
2. Copia `.env.example` para `.env` se `.env` ainda não existir (gerando um `JWT_SECRET` seguro aleatório).
3. Executa `docker compose build` e `docker compose up -d`.
4. Monitora o status dos contêineres até que todos estejam em estado `healthy`.
5. Executa `docker compose exec backend python seed.py` (se o banco ainda não possuir dados).
6. Exibe resumo com URL do sistema (`http://localhost:${APP_PORT}`), documentação OpenAPI (`http://localhost:${BACKEND_PORT}/docs`) e PIN inicial (`1234`).

---

## 4. Plano de Testes & Validação
1. **Teste de Build de Imagens:** Garantir que `docker compose build` constrói as duas imagens sem avisos críticos ou erros.
2. **Teste de Inicialização de Pilha:** Subir com `docker compose up -d` e verificar que MariaDB, Backend e Frontend ficam `healthy`.
3. **Teste de Proxy Reverso Nginx:**
   - Acesso a `http://localhost/` retorna o HTML da SPA.
   - Acesso a `http://localhost/health` retorna status 200 do FastAPI.
   - Acesso a `http://localhost/api/v1/packages/active` retorna os pacotes cadastrados.
4. **Teste de Persistência:**
   - Reiniciar os contêineres (`docker compose down && docker compose up -d`) e validar que os dados criados permanecem no MariaDB através do volume persistente.
