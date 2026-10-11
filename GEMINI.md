# Regras do Projeto SoftBarber

## 1. Superpowers Framework Ativo
O projeto SoftBarber opera sob a metodologia do framework **Superpowers** (localizado em `.agents/skills/`).
- **Planejamento e Brainstorming Obrigatórios:** Antes de escrever código para novas funcionalidades, execute o processo de brainstorming (`.agents/skills/brainstorming/SKILL.md`) e elaboração de planos detalhados (`.agents/skills/writing-plans/SKILL.md`).
- **Test-Driven Development (TDD):** Todo código de produção ou correção de bug deve seguir rigorosamente TDD (`.agents/skills/test-driven-development/SKILL.md`). Nunca escreva código sem primeiro criar um teste que falha e observar a falha.
- **Verificação Rigorosa:** Sempre validar e rodar testes antes de considerar uma tarefa concluída (`.agents/skills/verification-before-completion/SKILL.md`).
- **Depuração Sistemática:** Em caso de bugs ou falhas, siga o processo estruturado de depuração (`.agents/skills/systematic-debugging/SKILL.md`).

## 2. Sincronização Obrigatória com o GitHub (SoftBarber)
- **Destino Remoto:** Todas as alterações feitas no projeto devem ir para o repositório do GitHub chamado **SoftBarber**.
- **Regra de Push Contínuo:** 
  - Ao finalizar e testar cada etapa, tarefa ou alteração relevante, as mudanças devem ser adicionadas (`git add`), comitadas com mensagens semânticas claras (`git commit -m "feat/fix: ..."`) e enviadas ao repositório remoto via `git push origin <branch>`.
  - Nenhuma alteração aprovada deve permanecer desincronizada do repositório remoto do GitHub.
