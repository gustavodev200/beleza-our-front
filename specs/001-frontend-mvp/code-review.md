# Code Review: Frontend MVP do belezaOur

- **Security review**: [security-review.md](security-review.md) — PASS WITH WARNINGS
- **Status**: Aprovado com observações

Gates executados em 29/10/2026: `npm run typecheck` ✅ · `npm run lint` ✅ (0 erros, 0 avisos) ·
`npm run test:run` ✅ (23 testes) · `npm run build` ✅ (35 rotas) · E2E pelo proxy contra a API real ✅ (43/43).

## Achados

| # | Severidade | Onde | Achado | Ação |
|---|---|---|---|---|
| CR-1 | MEDIUM (perf) | `globals.css` / `material-symbols` | A fonte de ícones tem ~4 MB e `font-display: block`; no primeiro acesso os ícones aparecem só depois do download (texto não é afetado; o SW guarda a fonte em cache-first). | Próximo passo: gerar subset só com os ícones usados (lista finita no código). |
| CR-2 | LOW | `src/app/layout.tsx` | CSP com nonce exige render dinâmico em todas as páginas. As públicas usam `fetch` com `revalidate` (dados em cache), então o custo é só de render. | Aceito: segurança de script > ISR de página. |
| CR-3 | LOW | painel do dono | O sino do painel leva à Visão geral (novos e pendentes), como no protótipo; as notificações in-app do dono (ex.: cliente cancelou) ficam em `/notificacoes`. | Avaliar uma lista de notificações dentro do painel. |
| CR-4 | INFO | `/painel/cadastro` | Serviços sugeridos são criados um a um (sequencial) para manter a ordem e parar no primeiro erro. | Ok para ≤ 4 itens. |
| CR-5 | INFO | Planos | A API não tem modelo de plano; a tela é informativa e edita só `maxActiveProfessionals`. | Coerente com o MVP (cobrança fora do escopo). |

Padrões verificados: estado derivado em vez de `setState` em efeitos (regra `react-hooks/set-state-in-effect`);
formulários de modal montados só com o modal aberto (estado limpo a cada abertura); Zod na borda em todo
formulário e query param; toda lista com loading, vazio e erro; toast em toda mutação; alvos ≥ 44px nos
controles principais; foco visível global; `Esc` fecha modais (Radix).

## Confirmação de itens da Security Review

- SR-F1 documentado em `README.md`, `quickstart.md` e `../beleza-our-back/.env.example`.
- SR-F2 aceito e registrado. SR-F3 restrito a `development`.

## Confirmação de escopo

- Todas as telas do mapa §9 implementadas (cliente 12, dono 10, admin 8) + offline, 404, manifest, sitemap, robots.
- Fora do escopo (§12) não implementado: pagamento, cobrança de planos, push, app nativo.

## Conclusão

Aprovado. Antes do deploy: aplicar SR-F1 e testar os fluxos no navegador real (instalação do PWA em Android/iOS,
câmera do celular para o QR do TOTP).
