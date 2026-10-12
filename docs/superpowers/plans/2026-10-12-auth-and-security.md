# Autenticação e Segurança (Etapa A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar camada completa de autenticação e proteção de rotas no SoftBarber, com PIN numérico para o Painel da Barbearia (Admin) e identificação ágil do cliente por WhatsApp/telefone com emissão de tokens JWT.

**Architecture:** O backend utilizará Bcrypt para hashing do PIN administrativo e PyJWT (HS256) para emissão de tokens assinados com papéis `admin` e `customer`, validados via dependências FastAPI `HTTPBearer`. No frontend React, um `AuthContext` central gerenciará as credenciais com persistência em `localStorage`, integrando um modal de numpad tátil (`AdminPinModal`) e modal ágil de identificação do cliente (`CustomerLoginModal`).

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy 2.0, Bcrypt, PyJWT, React 18, TypeScript, Tailwind CSS, Vitest, Pytest.

**Spec:** [`docs/superpowers/specs/2026-10-12-auth-and-security-design.md`](file:///c:/SoftBarber/docs/superpowers/specs/2026-10-12-auth-and-security-design.md)

## Global Constraints

- Hashing de PIN estritamente com `bcrypt` (nunca armazenar PIN em texto puro).
- Algoritmo de token JWT: `HS256`, com secret configurável via `Settings.JWT_SECRET`.
- PIN administrativo padrão inicial para novas instâncias: `"1234"`.
- Telefone do cliente normalizado (aceita máscaras e busca por dígitos puros).
- Compatibilidade reversa: clientes existentes continuam funcionando sem perda de integridade no banco.
- Zero quebra na suíte de 79 testes já existente (45 backend + 34 frontend).

## Review Focus

- Input de PIN com caracteres não-numéricos ou comprimento inválido (< 4 ou > 8 dígitos) deve retornar HTTP 422 / 400.
- Tentativa de login admin com PIN incorreto deve retornar HTTP 401 Unauthorized com tempo de resposta consistente.
- Token JWT expirado ou adulterado deve retornar HTTP 401 Unauthorized imediato sem estourar exceção 500.
- Telefone do cliente com formatação variada `(11) 99999-9999` vs `11999999999` deve resolver para o mesmo cliente.
- Usuário sem perfil tentando acessar painel do barbeiro deve ser bloqueado na interface e na API.

---

### Task 1: Criptografia, Token JWT e Atualização do Modelo (`app/core/security.py`)

**Files:**
- Create: `app/core/security.py`
- Modify: `app/models/business_settings.py:10-40`
- Modify: `app/core/config.py:10-25`
- Test: `tests/test_security.py`

**Interfaces:**
- Produces:
  - `hash_pin(pin: str) -> str`
  - `verify_pin(plain_pin: str, hashed_pin: str) -> bool`
  - `create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str`
  - `decode_access_token(token: str) -> dict`
  - `BusinessSettings.admin_pin_hash: str`

- [ ] **Step 1: Write failing test in `tests/test_security.py`**

```python
def test_hash_and_verify_pin():
    hashed = hash_pin("1234")
    assert verify_pin("1234", hashed) is True
    assert verify_pin("9999", hashed) is False

def test_jwt_create_and_decode_valid_token():
    token = create_access_token({"sub": "admin", "role": "admin"})
    payload = decode_access_token(token)
    assert payload["sub"] == "admin"
    assert payload["role"] == "admin"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_security.py -v`  
Expected: FAIL (ModuleNotFoundError ou NameError)

- [ ] **Step 3: Implement `app/core/security.py` e atualizar `BusinessSettings`**

Adicionar funções de hash bcrypt, verificação e codificação/decodificação JWT em `app/core/security.py`, atualizar `app/core/config.py` com `JWT_SECRET = "softbarber-dev-secret-key-change-in-production"` e adicionar coluna `admin_pin_hash` em `app/models/business_settings.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_security.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/core/ app/models/ tests/test_security.py
git commit -m "feat(security): implement bcrypt pin hashing and PyJWT token utilities"
```

---

### Task 2: Schemas de Autenticação e Dependências FastAPI (`app/schemas/auth.py`, `app/api/deps.py`)

**Files:**
- Create: `app/schemas/auth.py`
- Create: `app/api/deps.py`
- Test: `tests/test_auth_deps.py`

**Interfaces:**
- Consumes: `app/core/security.py`, `app/core/database.py`, `app/models/customer.py`
- Produces:
  - Schemas: `AdminLoginRequest`, `AdminTokenResponse`, `ChangePinRequest`, `CustomerLoginRequest`, `CustomerTokenResponse`
  - Dependências: `get_current_admin(token)`, `get_current_customer(token, db)`, `get_optional_customer(token, db)`

- [ ] **Step 1: Write failing test in `tests/test_auth_deps.py`**

```python
def test_get_current_admin_valid_and_invalid():
    # Valid admin token should pass
    # Token with role customer or invalid signature should raise HTTPException(401)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_auth_deps.py -v`  
Expected: FAIL

- [ ] **Step 3: Implement `app/schemas/auth.py` e `app/api/deps.py`**

Implementar classes Pydantic DTOs e funções FastAPI de dependência utilizando `HTTPBearer(auto_error=False)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_auth_deps.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/schemas/auth.py app/api/deps.py tests/test_auth_deps.py
git commit -m "feat(auth): implement auth schemas and FastAPI security dependencies"
```

---

### Task 3: Endpoints REST de Autenticação e Atualização do Seed (`app/api/v1/auth.py`)

**Files:**
- Create: `app/api/v1/auth.py`
- Modify: `app/api/v1/__init__.py:1-20`
- Modify: `seed.py:15-60`
- Test: `tests/test_auth_api.py`

**Interfaces:**
- Consumes: `app/schemas/auth.py`, `app/api/deps.py`, `app/core/security.py`
- Produces:
  - `POST /api/v1/auth/admin/login`
  - `POST /api/v1/auth/admin/change-pin`
  - `POST /api/v1/auth/customer/login`
  - `GET /api/v1/auth/customer/me`

- [ ] **Step 1: Write failing test in `tests/test_auth_api.py`**

Testar login do admin com PIN "1234", troca de PIN com senha antiga, login do cliente com telefone existente e cadastro automático com novo telefone.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_auth_api.py -v`  
Expected: FAIL (404 Not Found)

- [ ] **Step 3: Implement `app/api/v1/auth.py`, registrar rotas e atualizar `seed.py`**

Implementar endpoints, registrar router em `app/api/v1/__init__.py` e garantir que o `seed.py` inicialize o `admin_pin_hash` com o hash de "1234".

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_auth_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/ seed.py tests/test_auth_api.py
git commit -m "feat(api): implement admin and customer authentication REST endpoints"
```

---

### Task 4: Cliente HTTP de Autenticação e Contexto de Sessão no Frontend (`AuthContext.tsx`)

**Files:**
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/api/client.ts:1-25`
- Test: `frontend/src/test/auth-context.test.tsx`

**Interfaces:**
- Produces:
  - `api/auth.ts`: `adminLogin(pin)`, `adminChangePin(oldPin, newPin)`, `customerLogin(phone, name, email)`, `getCurrentCustomer()`
  - `AuthContext`: hook `useAuth()` expondo `{ adminToken, customerToken, currentCustomer, isAdmin, loginAdmin, logoutAdmin, loginCustomer, logoutCustomer }`
  - `api/client.ts`: Interceptor anexando `Authorization: Bearer <token>` dinamicamente quando disponível.

- [ ] **Step 1: Write failing test in `frontend/src/test/auth-context.test.tsx`**

Testar login do admin salvando token em localStorage, logout limpando token, login do cliente e hidratação da sessão no boot.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/test/auth-context.test.tsx --run`  
Expected: FAIL

- [ ] **Step 3: Implement `frontend/src/api/auth.ts`, interceptor e `AuthContext.tsx`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/test/auth-context.test.tsx --run`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/auth.ts frontend/src/api/client.ts frontend/src/context/ frontend/src/test/auth-context.test.tsx
git commit -m "feat(frontend): implement auth HTTP client and persistent AuthContext"
```

---

### Task 5: Componente de PIN Touch do Admin (`AdminPinModal.tsx`) e Bloqueio de Modo no Header

**Files:**
- Create: `frontend/src/components/auth/AdminPinModal.tsx`
- Modify: `frontend/src/components/layout/Header.tsx:1-120`
- Test: `frontend/src/test/admin-pin-modal.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` de `frontend/src/context/AuthContext.tsx`
- Produces:
  - `AdminPinModal`: Teclado numérico touch com 4 círculos mascarados, feedback de erro com animação de tremor (*shake*) e desbloqueio.
  - `Header`: Intercepta o clique em "Painel da Barbearia"; se não autenticado como admin, abre `AdminPinModal`. Se autenticado, exibe botão de "Bloquear Painel".

- [ ] **Step 1: Write failing test in `frontend/src/test/admin-pin-modal.test.tsx`**

Testar digitação no teclado touch de 4 dígitos, botão de limpar, chamada de login com PIN e exibição de erro em caso de falha.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/test/admin-pin-modal.test.tsx --run`  
Expected: FAIL

- [ ] **Step 3: Implement `AdminPinModal.tsx` e integrar ao `Header.tsx`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/test/admin-pin-modal.test.tsx --run`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/auth/AdminPinModal.tsx frontend/src/components/layout/Header.tsx frontend/src/test/admin-pin-modal.test.tsx
git commit -m "feat(frontend): implement touch AdminPinModal and protected header navigation"
```

---

### Task 6: Modal e Barra de Identificação do Cliente (`CustomerLoginModal.tsx` & `ClientPortal.tsx`)

**Files:**
- Create: `frontend/src/components/auth/CustomerLoginModal.tsx`
- Modify: `frontend/src/pages/ClientPortal.tsx:1-500`
- Modify: `frontend/src/App.tsx:1-50`
- Test: `frontend/src/test/customer-login-modal.test.tsx`

**Interfaces:**
- Consumes: `useAuth()`
- Produces:
  - `CustomerLoginModal`: Input formatado de WhatsApp/Telefone e Nome.
  - `ClientPortal`: Reconhece cliente logado, atualiza o `customerId` dinamicamente para carregar seus pacotes e horários reais.
  - Exibe no topo do portal ou no cabeçalho: status de cliente logado com botão de troca de conta/sair.

- [ ] **Step 1: Write failing test in `frontend/src/test/customer-login-modal.test.tsx`**

Testar digitação de telefone, submissão, cadastro automático e logout.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/test/customer-login-modal.test.tsx --run`  
Expected: FAIL

- [ ] **Step 3: Implement `CustomerLoginModal.tsx`, integrar com `ClientPortal.tsx` e `App.tsx`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/test/customer-login-modal.test.tsx --run`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/auth/CustomerLoginModal.tsx frontend/src/pages/ClientPortal.tsx frontend/src/App.tsx frontend/src/test/customer-login-modal.test.tsx
git commit -m "feat(frontend): implement customer phone login modal and reactive portal sync"
```

---

### Task 7: Verificação Geral E2E, Build de Produção e Sincronização

**Files:**
- Modify: `tests/test_e2e_flow.py`
- Modify: `seed.py`
- Run: `pytest`
- Run: `cd frontend; npm.cmd test -- --run; npm.cmd run build`

- [ ] **Step 1: Run complete test suite and production build**

Verificar que todos os testes do backend (pytest) e frontend (vitest) passam com 100% de sucesso e compilação do Vite limpa.

- [ ] **Step 2: Update and execute seed script**

Executar `python seed.py` garantindo que o banco de dados local tenha o PIN padrão configurado e o cliente 1 associado.

- [ ] **Step 3: Merge and Push to GitHub repository**

Sincronizar branch no GitHub `https://github.com/Gallo41/SoftBarber.git` e verificar working tree limpa.
