# 💈 SoftBarber

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MariaDB](https://img.shields.io/badge/MariaDB-11.4_LTS-003545?style=flat&logo=mariadb&logoColor=white)](https://mariadb.org/)
[![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Sistema moderno, completo e de alta performance para gestão e agendamento de barbearias e salões, desenvolvido com foco em experiência do cliente (PWA Mobile-First) e controle operacional rigoroso.

---

## 🌟 Visão Geral

O **SoftBarber** unifica a experiência do cliente e a administração da barbearia em uma única aplicação web progressiva (PWA):

- **📱 Portal do Cliente (PWA Mobile-First):**
  - Catálogo de serviços com duração e preços detalhados.
  - Seleção intuitiva de barbeiro/profissional e data.
  - Grade de horários livres em tempo real com prevenção de conflitos.
  - Aquisição de pacotes promocionais de serviços com desconto.
  - Carteira de créditos transparente (uso automático de créditos de pacotes no agendamento).
  - Consulta e cancelamento de agendamentos com estorno automático de créditos.

- **🛡️ Painel Administrativo:**
  - Acesso protegido por PIN seguro (hashing PBKDF2/SHA256).
  - Visão geral da agenda diária e semanal por barbeiro.
  - Gestão de clientes, profissionais, serviços e pacotes promocionais.
  - Ajuste de parâmetros de negócio (horário de abertura/fechamento, intervalo de slots e limite de cancelamento).

---

## 🚀 Início Rápido em 1 Clique (Deploy Automatizado)

O SoftBarber é 100% conteinerizado e inclui scripts automatizados de implantação em 1 clique para qualquer sistema operacional.

### Linux / macOS
Execute o script interativo no terminal:
```bash
git clone https://github.com/SoftBarber/SoftBarber.git
cd SoftBarber
chmod +x deploy.sh
./deploy.sh
```

### Windows (PowerShell)
Execute no terminal PowerShell:
```powershell
git clone https://github.com/SoftBarber/SoftBarber.git
cd SoftBarber
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy.ps1
```

### Execução Direta via Docker Compose
Caso prefira gerenciar manualmente com o Docker Compose:
```bash
cp .env.example .env
docker compose up -d --build
```

---

## 🌐 Acesso ao Sistema e Credenciais Padrão

Após a inicialização dos contêineres:

| Recurso | URL de Acesso | Descrição |
|---|---|---|
| **Portal do Cliente / Aplicação** | [http://localhost](http://localhost) | Agendamento online e visualização de pacotes |
| **Painel Administrativo** | [http://localhost/admin](http://localhost/admin) | Gestão completa com login via PIN |
| **Documentação da API (OpenAPI)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI interativo com todos os endpoints |
| **Checagem de Saúde (Healthcheck)** | [http://localhost/health](http://localhost/health) | Endpoint de monitoramento do backend |

### Credenciais Padrão de Teste (Seed Automático):
- **PIN de Administrador Padrão:** `1234`
- **Cliente de Demonstração:** Telefone `(11) 99999-1111` (*João Silva* - possui saldo inicial de créditos de corte).
- **Profissionais Cadastrados:** *Carlos Silva* e *Marcos Rossi*.

---

## 🏗️ Arquitetura do Sistema

A solução foi projetada sob uma topologia robusta de micro-serviços isolados em rede Docker interna:

```mermaid
graph TD
    User([Navegador / Smartphone / PWA]) -->|Porta 80 / 443| Nginx[Frontend: Nginx 1.27 Alpine]
    
    subgraph Docker Network [softbarber_network]
        Nginx -->|/ (SPA Router)| Static[React 18 SPA Dist]
        Nginx -->|/api/* & /health & /docs| Backend[Backend: FastAPI + Python 3.12]
        Backend -->|Porta 3306 (SQLAlchemy)| DB[(MariaDB 11.4 LTS)]
    end

    subgraph Volumes Persistentes
        DB --> MariaDBData[(mariadb_data)]
    end
```

### Serviços Conteinerizados:
1. **`db` (MariaDB 11.4 LTS):** Banco relacional com transações ACID, charset `utf8mb4` e persistência no volume Docker `mariadb_data`.
2. **`backend` (FastAPI / Python 3.12):** API assíncrona de alta performance com validação Pydantic v2, ORM SQLAlchemy e autenticação JWT.
3. **`frontend` (React 18 + Vite + Nginx Alpine):** Multi-stage build compilado com Nginx atuando como servidor de arquivos estáticos SPA e proxy reverso inteligente com compressão gzip.

---

## 💼 Regras de Negócio Implementadas

- **📅 Agendamento Conflito-Zero:**
  - O cálculo de horários livres (`/api/v1/appointments/available-slots`) avalia a duração precisa de cada serviço, respeita o expediente configurado (`open_time` até `close_time`) e garante que nenhum profissional receba sobreposições de agendamento.
- **📦 Pacotes Promocionais com Idempotência:**
  - A compra de pacotes (`/api/v1/packages/purchase`) utiliza chave de idempotência (`idempotency_key`) para evitar cobranças ou créditos duplicados por cliques repetidos ou falhas de rede.
- **💳 Livro-Razão Atômico de Créditos (Credit Ledger):**
  - Cada crédito concedido, debitado ou estornado é registrado atomicamente na tabela `credit_ledger_transactions`, garantindo rastreabilidade e consistência financeira de saldo.
- **⏱️ Política de Cancelamento com Estorno Automático:**
  - Cancelamentos permitidos até **2 horas antes** do horário agendado (`cancellation_window_hours`). Se o agendamento foi pago com créditos de pacote promocional, o saldo é estornado instantaneamente para a carteira do cliente.
- **🔒 Segurança e Autenticação JWT:**
  - O acesso administrativo emite token Bearer JWT assinado após validação do PIN (`/api/v1/auth/admin-login`), com expiração configurável e headers de proteção.

---

## 💻 Desenvolvimento Local (Sem Docker)

Se desejar executar o backend e frontend individualmente em sua máquina local durante o desenvolvimento:

### 1. Pré-requisitos
- Python 3.12+
- Node.js 20+ e npm
- SQLite ou MariaDB local

### 2. Configurando o Backend
```bash
# Criar e ativar ambiente virtual
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt

# Executar migração/seed inicial
python seed.py

# Iniciar servidor FastAPI com hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Configurando o Frontend
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor Vite de desenvolvimento
npm run dev
```
O frontend estará acessível em `http://localhost:5173` apontando as chamadas de API para o backend local.

### 4. Executando a Suíte de Testes Automatizados
O SoftBarber possui testes unitários e de integração abrangentes:
```bash
# Executar todos os testes com pytest
pytest -v
```

---

## 📂 Estrutura de Pastas do Projeto

```text
SoftBarber/
├── app/                        # Backend FastAPI
│   ├── api/                    # Rotas e controladores REST (v1)
│   ├── core/                   # Configuração de banco, JWT e settings
│   ├── models/                 # Entidades e modelos SQLAlchemy
│   ├── schemas/                # Schemas de validação e serialização Pydantic
│   └── services/               # Camada de lógica de negócio e regras
├── docker/                     # Configurações de contêineres Docker
│   ├── backend.Dockerfile      # Dockerfile otimizado para FastAPI (Python 3.12)
│   ├── frontend.Dockerfile     # Multi-stage Dockerfile para React/Vite
│   ├── entrypoint.sh           # Script de inicialização do backend com retry DB
│   └── nginx.conf              # Configuração de proxy reverso e gzip do Nginx
├── docs/                       # Documentação de arquitetura e implantação
│   ├── deploy.md               # Guia detalhado de produção (VPS, SSL, Backup)
│   └── arquitetura-banco-e-negocio.md
├── frontend/                   # Aplicação Frontend React 18 + Vite
│   ├── src/                    # Código-fonte (Components, Pages, Hooks, Services)
│   ├── package.json
│   └── vite.config.ts
├── tests/                      # Suíte de testes automatizados com Pytest
├── .env.example                # Modelo oficial de variáveis de ambiente
├── deploy.sh                   # Script de deploy em 1 clique para Linux / macOS
├── deploy.ps1                  # Script de deploy em 1 clique para Windows
├── docker-compose.yml          # Orquestração de serviços MariaDB, Backend e Frontend
├── requirements.txt            # Dependências Python do backend
├── seed.py                     # Carga inicial de dados de demonstração
└── README.md                   # Documentação oficial do projeto
```

---

## 📖 Documentação Adicional

- [Guia Completo de Implantação em Produção (VPS, HTTPS/SSL, Backup & Restore)](docs/deploy.md)
- [Especificação de Arquitetura de Banco e Negócio](docs/arquitetura-banco-e-negocio.md)

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença [MIT](LICENSE).
