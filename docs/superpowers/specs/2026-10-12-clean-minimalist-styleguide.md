# SoftBarber — Clean Minimalist Styleguide (Apple / Linear)

## 1. Filosofia Visual
- **Foco em Conteúdo & Clareza:** Eliminação total de artifícios vintage/antigos (listras de poste de barbearia, papel envelhecido, texturas desgastadas e sombras duras de carimbo).
- **Estilo:** Moderno, acolhedor e descansado para os olhos — inspirado no equilíbrio do Notion, Craft e Apple.
- **Tonalidade Clara sem Ofuscar:** Fundo off-white acolhedor `#F5F5F4` (`stone-100`), cartões em branco puro `#FFFFFF` com sombras suaves (`shadow-sm`) e linhas finas em `#E7E5E4` (`stone-200`), tipografia Inter em grafite quente (`stone-900` / `#1C1917`).

## 2. Paleta de Cores (Soft / Warm Stone)
- **Fundo da Página:** `#F5F5F4` (`bg-stone-100`)
- **Superfícies & Cartões:** `#FFFFFF` (`bg-white`)
- **Superfícies Secundárias / Inputs:** `#F5F5F4` (`bg-stone-100`) ou `#FAFAF9` (`bg-stone-50`)
- **Texto Principal:** `#1C1917` (`text-stone-900`)
- **Texto Secundário:** `#78716C` (`text-stone-500`)
- **Divisórias e Bordas:** `#E7E5E4` (`border-stone-200`)
- **Acento Primário (Ação):** `#1C1917` sólido com texto branco (`bg-stone-900 text-white`)
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
