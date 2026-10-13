# SoftBarber — Guia de Estilo "Barbearia Clássica"

Reestilização APENAS VISUAL. Não altere lógica, props, textos de UI, `data-testid`, `aria-*`, roles, nomes de botões ou estrutura usada pelos testes.

## Tokens (já definidos em `frontend/tailwind.config.js`)
| Uso | Classe |
|---|---|
| Fundo da página | `bg-paper` |
| Superfície rebaixada / hover / trilhas | `bg-paper-dark`, `bg-paper-deep` |
| Cartões, modais, inputs | `bg-card` |
| Texto principal / bordas fortes | `text-ink`, `border-ink` |
| Texto secundário | `text-ink-soft` |
| Texto terciário, placeholders, ícones apagados | `text-ink-muted` |
| Divisórias suaves (dentro de cartões) | `border-ink-line`, `divide-ink-line` |
| Ação principal, preço, destaque, item ativo | `pole-red` (`bg-pole-red`, `text-pole-red`, `hover:bg-pole-red-dark`), fundo suave `bg-pole-red-tint` |
| Secundário / info / links | `pole-blue`, `bg-pole-blue-tint` |
| Sucesso | `text-moss`, `bg-moss-tint`, `border-moss` |
| Aviso | `text-mustard`, `bg-mustard-tint`, `border-mustard` |
| Erro | `text-pole-red`, `bg-pole-red-tint`, `border-pole-red` |
| Sombra carimbo | `shadow-stamp-sm`, `shadow-stamp`, `shadow-stamp-lg` (só em elementos de destaque: modal, cartão selecionado, CTA) |

Classes utilitárias em `index.css`: `card-paper` (bg-card + borda 1.5px tinta + rounded-sm), `sign-label` (rótulo Oswald caixa alta espaçado), `title-display` (serifa display), `input-paper` (campos), `pole-stripe` (faixa listrada do poste, h-1.5), `rule-double` (filete duplo).

## Tipografia
- Títulos de página/seção/modal: `font-display` (DM Serif Display, peso normal — NUNCA `font-bold` nele). Ex: `font-display text-3xl text-ink`.
- Rótulos, abas, cabeçalhos de tabela, legendas pequenas, metadados ("Profissional", "Data"): `sign-label` ou `font-sign uppercase tracking-[0.12em]`.
- Corpo: padrão (IBM Plex Sans). Use `font-medium`/`font-semibold`, evite `font-black`.
- Preços e números de destaque: `font-display` ou `font-sign`, em `text-pole-red` ou `text-ink`.

## Formas
- Cantos: `rounded-sm` (ou nenhum). Substitua `rounded-lg/xl/2xl/3xl` por `rounded-sm`. `rounded-full` só para pontos indicadores e avatares.
- Bordas: `border-[1.5px] border-ink` para contornos principais; `border-ink-line` para divisórias internas.
- Overlay de modal: `bg-ink/60` (sem `backdrop-blur`).
- Modal: `bg-card border-[1.5px] border-ink rounded-sm shadow-stamp-lg`. Cabeçalho do modal pode ter `pole-stripe` no topo.

## PROIBIDO (é o que dá "cara de IA")
- Qualquer `zinc-*`, `neutral-*`, `gray-*`, `slate-*`, `stone-*`, `amber-*`, `yellow-*`, `emerald-*`, `rose-*`, `sky-*`, `brand-*`, `red-*`, `green-*`, `blue-*`, `orange-*`, `violet-*`, `indigo-*`, `purple-*`. Use só os tokens acima (+ `white`/`black`/`transparent` se realmente necessário).
- Gradientes (`bg-gradient-*`, `from-*`, `to-*`, `via-*`), `backdrop-blur`, `shadow-*/cor` com glow, `animate-pulse`/`animate-ping` decorativos, `ring` neon.
- Ícone decorativo em todo rótulo. Mantenha ícones apenas onde ajudam a ação (fechar, voltar, calendário no seletor, etc.) e reduza tamanho/peso (`strokeWidth={1.75}` quando fácil). Pode remover ícones puramente decorativos de rótulos e cabeçalhos — mas NUNCA remova elementos que testes consultam.
- Emojis.

## Mapeamento rápido (dark → vintage)
- `bg-zinc-950`/`bg-zinc-900` (fundo) → `bg-paper`
- `bg-zinc-900` (cartão) / `bg-zinc-900/60` → `bg-card` + `border-[1.5px] border-ink` (ou `card-paper`)
- `bg-zinc-800`, `bg-zinc-800/50` (rebaixado) → `bg-paper-dark`
- `border-zinc-800/700` → `border-ink-line` (interno) ou `border-ink` (contorno)
- `text-white`, `text-zinc-100/200` → `text-ink`
- `text-zinc-300/400` → `text-ink-soft`
- `text-zinc-500/600` → `text-ink-muted`
- `text-amber-*`, `bg-amber-500` → `text-pole-red`, `bg-pole-red` (com `text-card`)
- `bg-amber-500/10` → `bg-pole-red-tint`
- emerald → moss; rose/red → pole-red; sky/blue → pole-blue; amber como aviso → mustard
- Item/aba ativo: `bg-ink text-card` ou sublinhado `border-b-2 border-pole-red text-ink`.

## Verificação obrigatória
Em `frontend/` (PowerShell):
```
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
npm.cmd test -- --run
npx.cmd tsc --noEmit
```
Grep nos seus arquivos deve retornar zero:
`Select-String -Path <arquivos> -Pattern "(zinc|neutral|gray|slate|stone|amber|yellow|emerald|rose|sky|brand|red|green|blue|orange|violet|indigo|purple)-\d|gradient|backdrop-blur"`
(atenção: `pole-red`/`pole-blue` são válidos — o padrão acima exige um dígito depois do hífen, então não os pega).

Edite arquivos com as ferramentas de edição (preservam UTF-8). NÃO use `Set-Content`/`Out-File` do PowerShell para reescrever arquivos com acentos. NÃO faça commit.
