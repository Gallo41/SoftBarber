# Core Backend: Gestão de Pacotes, Agendamento e Livro-Razão (Ledger)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos utilizam a sintaxe de checklist (`- [ ]`).

**Goal:** Construir a base da API REST em FastAPI com SQLAlchemy e MariaDB/SQLite (para testes), implementando a lógica de negócio completa para compra de pacotes, agendamento concorrente com abatimento atômico de créditos e cancelamento com estorno via Livro-Razão (Ledger).

**Architecture:** Camadas bem delimitadas (Schemas Pydantic, Models SQLAlchemy, Services com transações ACID e locking pessimista, Routers FastAPI). Validações atômicas no banco com `FOR UPDATE` para garantir zero duplo agendamento e zero saldo negativo.

**Tech Stack:** Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, PyMySQL / aiosqlite, pytest, httpx.

**Spec:** [`docs/arquitetura-banco-e-negocio.md`](file:///c:/SoftBarber/docs/arquitetura-banco-e-negocio.md)

---

## Global Constraints

- Python 3.13+ compatível.
- MariaDB compatível (usando tipos padrão e engine InnoDB).
- Todas as operações que alteram saldo de pacotes ou criam agendamentos DEVEM rodar dentro de transação ACID com `FOR UPDATE`.
- Toda alteração em saldo de crédito DEVE registrar uma entrada em `credit_ledger_transactions`.
- TDD estrito: todo componente deve ter teste falhando antes da implementação.

---

## Review Focus

1. **Saldo Zero / Insuficiente:** Cliente tenta agendar com pacote esgotado -> Esperado: Erro 400 explicativo sem alterar o Ledger ou criar agendamento.
2. **Concorrência em Agendamento:** Duas requisições simultâneas para o mesmo barbeiro no mesmo horário -> Esperado: A primeira é criada (201) e a segunda recebe 409 Conflict.
3. **Cancelamento Tardio:** Cliente cancela agendamento faltando menos tempo do que a janela de tolerância (`cancellation_window_hours`) -> Esperado: Agendamento é cancelado, mas nenhum crédito é devolvido.
4. **Idempotência de Compra/Agendamento:** Reenvio de requisição com o mesmo `Idempotency-Key` -> Esperado: Não gera cobrança/crédito duplicado.
5. **Pacote Vencido:** Cliente tenta usar crédito de pacote cuja `expires_at < now()` -> Esperado: Erro 400 com status marcado como `EXPIRED`.

---

## Estrutura de Diretórios Planejada

```
c:\SoftBarber\
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── settings.py
│   │   ├── customer.py
│   │   ├── professional.py
│   │   ├── service.py
│   │   ├── package.py
│   │   ├── appointment.py
│   │   └── ledger.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── package.py
│   │   ├── appointment.py
│   │   └── schedule.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── package_service.py
│   │   ├── appointment_service.py
│   │   └── schedule_service.py
│   └── api/
│       ├── __init__.py
│       └── v1/
│           ├── __init__.py
│           ├── packages.py
│           ├── appointments.py
│           └── professionals.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_models.py
│   ├── test_package_service.py
│   ├── test_appointment_service.py
│   ├── test_schedule_service.py
│   └── test_e2e_flow.py
├── requirements.txt
└── pytest.ini
```

---

## Tasks

### Task 1: Setup do Projeto e Conexão de Banco de Dados

**Files:**
- Create: `requirements.txt`
- Create: `pytest.ini`
- Create: `app/core/config.py`
- Create: `app/core/database.py`
- Create: `tests/conftest.py`

**Interfaces:**
- Produces: `get_db()` (generator yield Session), `engine`, `Base` (DeclarativeBase), `settings` (Settings)

- [ ] **Step 1: Criar requirements.txt e pytest.ini**
- [ ] **Step 2: Escrever o teste que valida a criação da sessão de banco de dados (`tests/test_database.py`)**
- [ ] **Step 3: Executar pytest para ver falhar**
- [ ] **Step 4: Implementar `app/core/config.py` e `app/core/database.py`**
- [ ] **Step 5: Executar pytest para validar aprovação**
- [ ] **Step 6: Commit**

---

### Task 2: Modelos ORM do Banco de Dados (SQLAlchemy 2.0)

**Files:**
- Create: `app/models/base.py`
- Create: `app/models/settings.py`
- Create: `app/models/customer.py`
- Create: `app/models/professional.py`
- Create: `app/models/service.py`
- Create: `app/models/package.py`
- Create: `app/models/appointment.py`
- Create: `app/models/ledger.py`
- Test: `tests/test_models.py`

**Interfaces:**
- Consumes: `Base` de `app/core/database.py`
- Produces: Classes `BusinessSettings`, `Customer`, `Professional`, `Service`, `ProfessionalService`, `Package`, `PackageItem`, `CustomerPackage`, `CustomerPackageBalance`, `Appointment`, `CreditLedgerTransaction`

- [ ] **Step 1: Escrever teste em `tests/test_models.py` validando relacionamentos, constraints e criação de todas as tabelas**
- [ ] **Step 2: Executar pytest e observar a falha**
- [ ] **Step 3: Implementar as classes ORM em `app/models/`**
- [ ] **Step 4: Executar pytest e verificar passagem**
- [ ] **Step 5: Commit**

---

### Task 3: Serviço e Endpoints de Compra de Pacotes (`PackageService`)

**Files:**
- Create: `app/schemas/package.py`
- Create: `app/services/package_service.py`
- Create: `app/api/v1/packages.py`
- Test: `tests/test_package_service.py`

**Interfaces:**
- Consumes: Models `CustomerPackage`, `CustomerPackageBalance`, `CreditLedgerTransaction`
- Produces: `PackageService.purchase_package(db: Session, customer_id: int, package_id: int, idempotency_key: str | None) -> CustomerPackage`
- Produces: `POST /api/v1/packages/purchase`, `GET /api/v1/customers/{customer_id}/packages`

- [ ] **Step 1: Escrever testes unitários em `tests/test_package_service.py` para compra de pacote, cálculo de `expires_at`, criação de saldos e registro no Ledger com tipo `PURCHASE`**
- [ ] **Step 2: Executar pytest e ver falhar**
- [ ] **Step 3: Implementar `PackageService.purchase_package` e `PackageService.get_customer_packages`**
- [ ] **Step 4: Implementar schemas Pydantic e router em `app/api/v1/packages.py`**
- [ ] **Step 5: Executar pytest e validar passagem**
- [ ] **Step 6: Commit**

---

### Task 4: Serviço de Agendamento com Abatimento Atômico de Crédito (`AppointmentService`)

**Files:**
- Create: `app/schemas/appointment.py`
- Create: `app/services/appointment_service.py`
- Create: `app/api/v1/appointments.py`
- Test: `tests/test_appointment_service.py`

**Interfaces:**
- Consumes: `PackageService`, Models `Appointment`, `CustomerPackageBalance`, `CreditLedgerTransaction`
- Produces: `AppointmentService.book_with_credit(db, customer_package_id, service_id, professional_id, start_time, idempotency_key)`
- Produces: `POST /api/v1/appointments/book-with-credit`

- [ ] **Step 1: Escrever testes em `tests/test_appointment_service.py` para:**
  - Agendamento bem-sucedido com abatimento (-1) no saldo e registro `DEBIT_BOOKING` no Ledger.
  - Tentativa de agendamento com saldo zerado (lança erro 400).
  - Tentativa de agendamento em horário com overlap/conflito na agenda do profissional (lança erro 409).
  - Tentativa com pacote vencido (lança erro 400).
- [ ] **Step 2: Executar pytest e observar falhas**
- [ ] **Step 3: Implementar `AppointmentService.book_with_credit` utilizando `with_for_update()`**
- [ ] **Step 4: Implementar o endpoint em `app/api/v1/appointments.py`**
- [ ] **Step 5: Executar pytest e validar aprovação**
- [ ] **Step 6: Commit**

---

### Task 5: Cancelamento de Agendamento e Estorno de Crédito no Ledger

**Files:**
- Modify: `app/services/appointment_service.py`
- Modify: `app/api/v1/appointments.py`
- Test: `tests/test_appointment_service.py`

**Interfaces:**
- Produces: `AppointmentService.cancel_appointment(db, appointment_id, reason)`
- Produces: `POST /api/v1/appointments/{appointment_id}/cancel`

- [ ] **Step 1: Escrever testes para cancelamento:**
  - Cancelamento dentro do prazo (`now <= start_time - window`): restaura saldo (+1) e cria `REFUND_CANCELLATION` no Ledger.
  - Cancelamento fora do prazo (`now > start_time - window`): cancela status, mas NÃO restaura o crédito.
- [ ] **Step 2: Executar pytest e observar falhas**
- [ ] **Step 3: Implementar a lógica de verificação de prazo e rollback de crédito no `AppointmentService`**
- [ ] **Step 4: Implementar o endpoint de cancelamento**
- [ ] **Step 5: Executar pytest e confirmar passagem**
- [ ] **Step 6: Commit**

---

### Task 6: Cálculo de Horários Disponíveis da Agenda (`ScheduleService`)

**Files:**
- Create: `app/schemas/schedule.py`
- Create: `app/services/schedule_service.py`
- Create: `app/api/v1/professionals.py`
- Test: `tests/test_schedule_service.py`

**Interfaces:**
- Produces: `ScheduleService.get_available_slots(db, professional_id, service_id, target_date)`
- Produces: `GET /api/v1/professionals/{professional_id}/available-slots`

- [ ] **Step 1: Escrever testes em `tests/test_schedule_service.py` validando geração de slots de 30min entre open_time e close_time, excluindo slots ocupados por agendamentos existentes**
- [ ] **Step 2: Executar pytest e observar falha**
- [ ] **Step 3: Implementar algoritmo de geração e subtração de slots no `ScheduleService`**
- [ ] **Step 4: Implementar endpoint no router de profissionais**
- [ ] **Step 5: Executar pytest e verificar passagem**
- [ ] **Step 6: Commit**

---

### Task 7: Montagem da Aplicação FastAPI e Teste E2E do Fluxo Completo

**Files:**
- Create: `app/main.py`
- Create: `tests/test_e2e_flow.py`

**Interfaces:**
- Produces: Aplicação `FastAPI` completa com CORS, routers v1 incluídos, documentação OpenAPI Swagger.

- [ ] **Step 1: Escrever o teste End-to-End (`test_e2e_flow.py`) simulando:**
  1. Compra de pacote de 4 serviços.
  2. Consulta do saldo do cliente (deve ser 4).
  3. Consulta dos horários livres do profissional.
  4. Agendamento consumindo 1 crédito.
  5. Consulta do saldo (deve ser 3) e verificação do Ledger.
  6. Cancelamento dentro do prazo com verificação de estorno (saldo volta para 4 e Ledger tem REFUND_CANCELLATION).
- [ ] **Step 2: Executar pytest e ver falhar**
- [ ] **Step 3: Implementar `app/main.py` integrando todos os routers**
- [ ] **Step 4: Executar a suíte completa de testes (`pytest -v`) e garantir 100% de aprovação**
- [ ] **Step 5: Commit final e verificação de integridade**
