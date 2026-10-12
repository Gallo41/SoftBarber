# Frontend React: Portal do Cliente e Painel Administrativo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos utilizam a sintaxe de checklist (`- [ ]`).

**Goal:** Desenvolver o Frontend completo do SoftBarber em React + TypeScript + Vite + Tailwind CSS, integrando 100% dos fluxos com a API FastAPI (compra de pacotes, carteira de créditos, agendamento em tempo real com crédito, cancelamento com estorno e painel do profissional).

**Architecture:** Single-Page Application (SPA) modular com Tailwind CSS para estilização, tipagens TypeScript estritas correspondentes aos schemas da API, serviços de API desacoplados e componentes de UI reutilizáveis.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Axios, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-11-frontend-react-client-and-admin-design.md`](file:///c:/SoftBarber/docs/superpowers/specs/2026-10-11-frontend-react-client-and-admin-design.md)

---

## Global Constraints
- Node.js LTS v24+ e npm v11+.
- React 18 + Vite + TypeScript.
- Tailwind CSS configurado para tema dark mode moderno (`zinc` e `amber`).
- Todas as chamadas de API devem tratar erros de rede e exibir mensagens claras e amigáveis ao usuário.
- Build de produção sem nenhum erro de tipagem (`npm run build`).

---

## Review Focus
1. **Responsividade Mobile:** A navegação do cliente deve funcionar perfeitamente em telas pequenas (smartphones).
2. **Atualização Reativa de Saldo:** Após comprar um pacote ou cancelar um agendamento com estorno, a carteira de créditos deve ser atualizada imediatamente na tela.
3. **Prevenção de Duplo Clique:** Botões de "Comprar Pacote" e "Confirmar Agendamento" devem desabilitar durante a requisição e utilizar `Idempotency-Key`.
4. **Alerta de Horário Indisponível:** Se outro usuário reservar o horário no mesmo instante, o frontend deve exibir o erro 409 amigavelmente e atualizar os slots livres.
5. **Aviso de Cancelamento:** Explicar com clareza a regra de tolerância de cancelamento antes de confirmar.

---

## Tasks

### Task 1: Scaffolding do Projeto Frontend (Vite + React + TS + Tailwind CSS)
**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/index.html`

- [ ] **Step 1: Criar estrutura do projeto Vite React TS**
- [ ] **Step 2: Instalar dependências (lucide-react, tailwindcss, postcss, autoprefixer, axios)**
- [ ] **Step 3: Configurar Tailwind CSS com a paleta dark/amber**
- [ ] **Step 4: Executar `npm run build` para validar compilação limpa**
- [ ] **Step 5: Commit**

---

### Task 2: Tipos TypeScript e Cliente de API HTTP
**Files:**
- Create: `frontend/src/types/api.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/packages.ts`
- Create: `frontend/src/api/appointments.ts`
- Create: `frontend/src/api/schedule.ts`

- [ ] **Step 1: Definir interfaces TypeScript sincronizadas com os schemas Pydantic do backend**
- [ ] **Step 2: Configurar cliente HTTP Axios com baseURL dinâmico (`VITE_API_URL` ou `http://localhost:8000/api/v1`)**
- [ ] **Step 3: Implementar métodos de API para pacotes, carteira, agendamento e slots**
- [ ] **Step 4: Commit**

---

### Task 3: Componentes de Pacotes e Carteira de Créditos
**Files:**
- Create: `frontend/src/components/packages/PackageCard.tsx`
- Create: `frontend/src/components/packages/WalletBalance.tsx`
- Create: `frontend/src/components/packages/PackageListModal.tsx`

- [ ] **Step 1: Implementar `PackageCard` com botão de compra e cálculo de sessões**
- [ ] **Step 2: Implementar `WalletBalance` exibindo créditos restantes e data de expiração**
- [ ] **Step 3: Commit**

---

### Task 4: Fluxo de Agendamento em Tempo Real com Crédito
**Files:**
- Create: `frontend/src/components/booking/SlotPicker.tsx`
- Create: `frontend/src/components/booking/BookingModal.tsx`
- Create: `frontend/src/components/booking/ServiceCard.tsx`

- [ ] **Step 1: Implementar `SlotPicker` com seletor de data e slots dinâmicos em tempo real**
- [ ] **Step 2: Implementar `BookingModal` com opção de usar crédito do pacote ou pagamento no local**
- [ ] **Step 3: Commit**

---

### Task 5: Lista de Agendamentos e Fluxo de Cancelamento com Estorno
**Files:**
- Create: `frontend/src/components/appointments/AppointmentList.tsx`
- Create: `frontend/src/components/appointments/CancelModal.tsx`

- [ ] **Step 1: Implementar lista de agendamentos com badges de status**
- [ ] **Step 2: Implementar modal de cancelamento com aviso de estorno de crédito e integração com a API**
- [ ] **Step 3: Commit**

---

### Task 6: Telas Principais (Portal do Cliente & Painel do Profissional)
**Files:**
- Create: `frontend/src/pages/ClientPortal.tsx`
- Create: `frontend/src/pages/AdminDashboard.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implementar `ClientPortal` com navegação móvel rápida (Agendar, Pacotes, Carteira, Meus Horários)**
- [ ] **Step 2: Implementar `AdminDashboard` com linha do tempo de horários da barbearia**
- [ ] **Step 3: Integrar rotas e alternador de perfil no `App.tsx`**
- [ ] **Step 4: Commit**

---

### Task 7: Validação de Build, Testes e Verificação Geral
**Files:**
- Test & Verify: `frontend/src/`

- [ ] **Step 1: Executar `npm run build` e garantir compilação TypeScript com 0 erros**
- [ ] **Step 2: Commit final e sincronização com o GitHub**
