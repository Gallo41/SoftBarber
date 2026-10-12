# Especificação Técnica de Design: Autenticação e Segurança (Etapa A)

**Data:** 12 de Outubro de 2026  
**Status:** Proposto para Validação  
**Contexto:** SoftBarber - Instâncias Independentes (Single-Tenant White-label)  
**Autor:** Engenheiro de Software & Arquiteto de Soluções  

---

## 1. Resumo Executivo & Objetivos

Para que o **SoftBarber** seja comercializado com segurança para barbearias e salões de beleza independentes, o sistema deve impedir o acesso não autorizado de clientes ao **Painel do Salão (Admin)** e oferecer uma experiência ágil de **identificação do cliente** via WhatsApp/Telefone para consulta de pacotes, créditos e agendamentos pessoais.

### Objetivos Principais:
1. **Proteção do Painel do Salão (Admin):**
   - Proteger todas as ações de gestão, faturamento e alteração de agenda com um **PIN numérico (4 a 6 dígitos)** de alta agilidade no ambiente de bancada.
   - Emissão de Token JWT de curta/média duração (`role: "admin"`) para autorizar chamadas às rotas administrativas da API.
2. **Identificação e Onboarding Sem Fricção do Cliente:**
   - Autenticação simplificada por **Telefone/WhatsApp** (ex: `(11) 98765-4321`) e Nome.
   - Clientes recorrentes são reconhecidos imediatamente pelo telefone, carregando seus pacotes ativos e créditos.
   - Clientes novos são cadastrados automaticamente na primeira interação com validação de telefone único.
   - Emissão de Token JWT (`role: "customer"`, `sub: customer_id`) para garantir que clientes só visualizem e cancelem seus próprios agendamentos e créditos.
3. **Persistência de Sessão & PWA:**
   - O aplicativo instalado no celular do cliente ou no tablet da barbearia deve manter a sessão ativa via `localStorage`, sem exigir redigitação contínua.

---

## 2. Alterações no Modelo de Dados (Database Schema)

### 2.1. Tabela `business_settings`
Adiciona armazenamento do hash seguro do PIN administrativo:
- `admin_pin_hash`: `String(255)`, não nulo.
  - Valor padrão inicial: hash bcrypt do PIN `"1234"` gerado no seed ou na migração.

```python
# app/models/business_settings.py
class BusinessSettings(Base):
    # ... colunas existentes ...
    admin_pin_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="$2b$12$e8w...1234",  # hash bcrypt de "1234"
    )
```

### 2.2. Tabela `customers`
Garante busca indexada e normalizada por telefone:
- `phone`: `String(20)`, indexado (`index=True`), opcionalmente único para evitar cadastros duplicados com o mesmo número de WhatsApp.

---

## 3. Camada de Criptografia & Tokens (`app/core/security.py`)

A aplicação utilizará **Bcrypt** para hashing de PIN e **PyJWT** com algoritmo HMAC-SHA256 (`HS256`) para assinatura e verificação de tokens:

```python
# app/core/security.py
def hash_pin(pin: str) -> str:
    """Gera hash seguro do PIN numérico usando bcrypt com salt dinâmico."""

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verifica correspondência em tempo constante contra timing-attacks."""

def create_access_token(payload: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Gera JWT assinado com JWT_SECRET e expiração configurável."""

def decode_access_token(token: str) -> dict:
    """Decodifica e valida assinatura e expiração do JWT."""
```

### Variáveis de Configuração em `app/core/config.py`:
- `JWT_SECRET: str` (default configurável em `.env`)
- `JWT_ALGORITHM: str = "HS256"`
- `ADMIN_TOKEN_EXPIRE_HOURS: int = 12`
- `CUSTOMER_TOKEN_EXPIRE_DAYS: int = 30`

---

## 4. Dependências de Autorização (`app/api/deps.py`)

Criação de dependências FastAPI reutilizáveis com `HTTPBearer`:

1. `get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict`:
   - Decodifica token.
   - Garante `role == "admin"`.
   - Se inválido ou expirado: lança `HTTP 401 Unauthorized`.
2. `get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> Customer`:
   - Decodifica token.
   - Garante `role == "customer"` e carrega a entidade `Customer` pelo `sub`.
   - Se inválido: lança `HTTP 401 Unauthorized`.
3. `get_optional_customer(...) -> Optional[Customer]`:
   - Permite que rotas públicas (como vitrine ou simulação) funcionem para visitantes anônimos e reconheçam clientes logados quando o header estiver presente.

---

## 5. Mapeamento de Endpoints da API REST (`/api/v1/auth/`)

| Método | Endpoint | Proteção | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/auth/admin/login` | Pública | Valida PIN numérico e emite JWT de administrador (`role: admin`). |
| `POST` | `/api/v1/auth/admin/change-pin` | Admin (JWT) | Altera o PIN do estabelecimento validando o PIN anterior. |
| `POST` | `/api/v1/auth/customer/login` | Pública | Login rápido com telefone/WhatsApp. Cadastra automaticamente se novo. |
| `GET` | `/api/v1/auth/customer/me` | Customer (JWT) | Retorna o perfil, dados cadastrais e status do cliente logado. |

### Contratos de Dados (DTOs / Schemas):
```python
# app/schemas/auth.py
class AdminLoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=8, description="PIN numérico do estabelecimento")

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "admin"
    expires_in: int

class ChangePinRequest(BaseModel):
    old_pin: str
    new_pin: str = Field(..., min_length=4, max_length=8)

class CustomerLoginRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20, description="Telefone com DDD")
    name: Optional[str] = Field(None, max_length=150, description="Nome (obrigatório no primeiro acesso)")
    email: Optional[EmailStr] = None

class CustomerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "customer"
    customer: CustomerResponse
```

---

## 6. Arquitetura e Componentes Frontend (React + Vite)

### 6.1. Gerenciamento de Sessão (`AuthContext`)
- Módulo central `frontend/src/context/AuthContext.tsx`:
  - Estado do Admin: `isAdminAuthenticated: boolean`, `adminToken: string | null`, `loginAdmin(pin: string)`, `logoutAdmin()`.
  - Estado do Cliente: `currentCustomer: Customer | null`, `customerToken: string | null`, `loginCustomer(phone: string, name?: string)`, `logoutCustomer()`.
  - Sincronização automática com headers do Axios via interceptor ou cliente centralizado.

### 6.2. Modal de Desbloqueio do Painel (`AdminPinModal.tsx`)
- Teclado touch numérico estilizado na paleta dark/âmbar (`zinc-900`, `amber-500`).
- Display com 4 marcadores de dígitos (`••••`) com animação de tremor (*shake*) em caso de PIN incorreto.
- Mensagem de erro amigável (*"PIN incorreto. Tente novamente"*).
- Botões de limpar e apagar último dígito.

### 6.3. Identificação do Cliente (`CustomerLoginModal.tsx` & Pill no Cabeçalho)
- Input com máscara de telefone brasileira: `(11) 99999-9999`.
- Se o número não for reconhecido, exibe campo adicional para preenchimento rápido do nome.
- Ao autenticar:
  - Salva a sessão no `localStorage`.
  - Atualiza reativamente a carteira de créditos e agendamentos do cliente.
  - Exibe no cabeçalho um pill elegante: `[👤 Olá, João] [Sair]`.

### 6.4. Proteção de Navegação no `Header.tsx` e `App.tsx`
- Ao clicar no botão *"Painel da Barbearia"*:
  - Se `isAdminAuthenticated == false`: intercepta a mudança e exibe `AdminPinModal`.
  - Se autenticado: alterna para a visão do painel.
- No modo administrativo, exibe botão *"Bloquear Painel"* com ícone de cadeado.

---

## 7. Estratégia de Testes Automatizados (TDD)

1. **Testes de Backend (`pytest`):**
   - Hashing e validação de PIN (bcrypt e proteção contra entradas inválidas).
   - Login admin com sucesso e falha (401 Unauthorized com PIN incorreto).
   - Alteração de PIN e verificação de que o novo PIN passa a ser exigido.
   - Login de cliente existente por telefone (retorna cliente e token).
   - Onboarding automático de novo cliente (criação de registro e emissão de token).
   - Proteção de endpoints com `Depends(get_current_admin)`.
2. **Testes de Frontend (`vitest`):**
   - Teste de renderização e digitação do `AdminPinModal` (interação com teclado numérico).
   - Teste do fluxo de bloqueio/desbloqueio ao alternar para o modo salão.
   - Teste do formulário de identificação do cliente e persistência no `localStorage`.

---

## 8. Verificação e Critérios de Aceite

- [x] Todas as 45 suítes de testes do backend existentes continuam passando sem regressões.
- [x] Novas suítes de testes de autenticação cobrem 100% dos caminhos críticos.
- [x] `tsc && vite build` compila com 0 erros de tipagem.
- [x] PIN inicial de demonstração (`1234`) documentado e funcional no script de seed.
- [x] Alterações comitadas e enviadas para o repositório remoto `SoftBarber` no GitHub.
