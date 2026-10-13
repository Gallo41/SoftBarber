# SoftBarber — Clean Minimalist Styleguide (Apple / Linear)

## 1. Filosofia Visual
- **Foco em Conteúdo & Clareza:** Eliminação total de artifícios vintage/antigos (listras de poste de barbearia, papel envelhecido, texturas desgastadas e sombras duras de carimbo).
- **Estilo:** Moderno, limpo e direto — inspirado na clareza do ecossistema Apple e na precisão técnica do Linear.
- **Leveza:** Fundo branco puro `#FFFFFF` e cinza claro neutro `#F8FAFC`, linhas finas de 1px com tons suaves (`slate-200/90`), tipografia Inter de altíssima legibilidade.

## 2. Paleta de Cores
- **Fundo da Página:** `#F8FAFC` (`bg-slate-50`)
- **Superfícies & Cartões:** `#FFFFFF` (`bg-white`)
- **Superfícies Secundárias / Inputs:** `#F1F5F9` (`bg-slate-100`) ou `#F8FAFC` (`bg-slate-50/70`)
- **Texto Principal:** `#0F172A` (`text-slate-900`)
- **Texto Secundário:** `#64748B` (`text-slate-500`)
- **Divisórias e Bordas:** `#E2E8F0` (`border-slate-200`)
- **Acento Primário (Ação):** `#0F172A` sólido com texto branco (`bg-slate-900 text-white`)
- **Destaque / Links:** Azul sutil (`text-blue-600`)

### Estados e Badges
- **Ativo / Sucesso / Concluído:** `bg-emerald-50 text-emerald-700 border-emerald-200/70`
- **Aviso / Expirando:** `bg-amber-50 text-amber-700 border-amber-200/70`
- **Erro / Cancelado:** `bg-rose-50 text-rose-700 border-rose-200/70`
- **Agendado / Informativo:** `bg-sky-50 text-sky-700 border-sky-200/70`
- **Confirmado:** `bg-blue-50 text-blue-700 border-blue-200/70`
- **Neutro:** `bg-slate-100 text-slate-700 border-slate-200/70`

## 3. Tipografia
- **Família:** `Inter` (auto-hospedada via `@fontsource/inter` para suporte PWA offline), com fallback para `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Hierarquia:**
  - Títulos principais: `font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight`
  - Títulos de cartões: `font-semibold text-base sm:text-lg text-slate-900`
  - Rótulos / Placas: `text-xs font-semibold uppercase tracking-wider text-slate-500`
  - Valores e Horários: `tabular-nums font-bold text-slate-900`

## 4. Componentes Chave
- **Botões:** `rounded-xl`, micro-sombras `shadow-xs`, escala de clique suave `active:scale-[0.98]`.
- **Badges:** `rounded-full px-2.5 py-0.5 text-xs font-medium` com ponto indicador circular.
- **Cards:** `bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 hover:shadow-sm`.
- **Numpad Admin:** Botões circulares suaves `rounded-full bg-slate-50 border-slate-100` estilo tela de bloqueio iOS.
- **Navegação:** Controles segmentados estilo Apple (`bg-slate-100 p-1 rounded-xl` com pill ativa `bg-white text-slate-900 shadow-xs`).
