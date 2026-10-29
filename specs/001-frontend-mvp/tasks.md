---

description: "Task list for Frontend MVP do belezaOur"
---

# Tasks: Frontend MVP do belezaOur

**Input**: Design documents from `/specs/001-frontend-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/api-usage.md, quickstart.md

**Tests**: unitários (Vitest) para utilitários puros e validação — formatação de data/dinheiro/telefone,
schemas Zod, `safeRedirect`, layout de sobreposição da agenda. Gate: `npm run lint`, `npm run test:run`,
`npm run build`.

**Organization**: por user story (spec.md), em ordem de prioridade.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Criar `package.json`, `tsconfig.json`, `next.config.ts` (rewrite `/api`, headers de segurança, `sw.js` sem cache), `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`
- [X] T002 [P] Criar `.env.example` (API_URL, NEXT_PUBLIC_SITE_URL) e `.gitignore` cobrindo `.env*`, chaves e builds
- [X] T003 [P] Criar `README.md` do frontend (stack, como rodar com o backend, variáveis, scripts)

## Phase 2: Foundational

- [X] T004 Design system: tokens em `src/app/globals.css` (`@theme`), fontes em `src/app/fonts.ts`
- [X] T005 [P] Primitivas em `src/components/ui/` (Icon, Button, Input/Field/Textarea/Select, Chip, Toggle, StatusBadge, Card, Avatar, Stars, Dialog, Sheet, Tabs/Segmented, states Loading/Empty/Error, Skeleton)
- [X] T006 [P] `src/lib/format.ts` (data/hora SP, BRL, duração, telefone E.164 ↔ máscara, dias), `src/lib/colors.ts` (matiz por nome), `src/lib/safe-redirect.ts` + testes
- [X] T007 `src/lib/api.ts` (fetch same-origin, `ApiError`, 401/403 → login da área), `src/lib/server-api.ts` (SSR), `src/lib/types.ts` (tipos da API)
- [X] T008 `src/lib/auth-client.ts` (Better Auth + phoneNumber + twoFactor), `src/lib/schemas.ts` (Zod espelhando o backend) + testes
- [X] T009 `src/proxy.ts` (CSP com nonce + checagem otimista de sessão por área)
- [X] T010 `src/app/layout.tsx` (fontes, metadata, viewport, Providers: QueryClient + Toaster), `not-found.tsx`, `robots.ts`, `sitemap.ts`
- [X] T011 Hooks de sessão/perfil (`useMe`), `RequireRole`, query keys em `src/lib/queries.ts`

**Checkpoint**: app sobe, `/api/health` responde via rewrite.

## Phase 3: US1 — Cliente encontra e agenda (P1) 🎯 MVP

- [X] T012 [US1] Shell do cliente: header web, tab bar mobile, rodapé em `src/app/(client)/layout.tsx`
- [X] T013 [US1] Início `src/app/(client)/page.tsx` (hero com busca, populares, categorias, destaques com chips, faixa profissionais)
- [X] T014 [US1] Explorar `src/app/(client)/explorar/page.tsx` (filtros na URL validados com Zod, cards, paginação, vazio)
- [X] T015 [US1] Perfil `src/app/(client)/[slug]/page.tsx` (SSR + metadata OG, capa/logo, abas, card fixo, favoritar/compartilhar/mapa/WhatsApp)
- [X] T016 [US1] Agendamento `src/app/(client)/[slug]/agendar/page.tsx` + `components/client/booking-flow.tsx` (5 passos, resumo fixo, OTP inline, `SLOT_TAKEN`)
- [X] T017 [US1] Confirmação `src/app/(client)/agendamentos/[id]/confirmado/page.tsx` (calendário .ics, mapa)
- [X] T018 [US1] Entrar/Criar conta `src/app/(client)/entrar/page.tsx` (abas, telefone → código, reenvio 30s, `next=` seguro)

## Phase 4: US2 — Cliente gerencia agendamentos (P1)

- [X] T019 [US2] Meus agendamentos (abas, cancelar inline, avaliar modal, agendar novamente)
- [X] T020 [US2] Remarcar `src/app/(client)/agendamentos/[id]/remarcar/page.tsx` (reuso do booking-flow)
- [X] T021 [P] [US2] Favoritos, Notificações (badge, marcar lidas), Perfil (dados, consentimento, exportar, excluir, sair, área do profissional)

## Phase 5: US3 — Dono cadastra e acompanha aprovação (P1)

- [X] T022 [US3] Entrar do dono (tela dividida), esqueci/redefinir senha, reenviar verificação
- [X] T023 [US3] Onboarding 6 passos `src/app/painel/cadastro/page.tsx` (progresso, validação por passo, retomada após verificação do e-mail)
- [X] T024 [US3] Status do cadastro `src/app/painel/status/page.tsx` (em análise / aprovado / ajustes)

## Phase 6: US4 — Dono opera a agenda (P2)

- [X] T025 [US4] Shell do painel (sidebar, topo, badge pendentes, guard ACTIVE)
- [X] T026 [US4] Visão geral
- [X] T027 [US4] Agenda Semana/Dia (`lib/agenda-layout.ts` + teste), gaveta de detalhes com ações
- [X] T028 [US4] Modais Novo agendamento (balcão) e Bloquear horário
- [X] T029 [P] [US4] Serviços (tabela, CRUD, toggle visível)
- [X] T030 [P] [US4] Profissionais (cards, CRUD, serviços, ativar/desativar, ver agenda)
- [X] T031 [P] [US4] Perfil público (capa/logo, dados, horários, link e compartilhamento)
- [X] T032 [US4] Minha agenda (PWA) `src/app/(client)/minha-agenda/page.tsx`

## Phase 7: US5 — Super Admin (P2)

- [X] T033 [US5] Entrar + 2FA (verificação e cadastro do TOTP com QR)
- [X] T034 [US5] Shell admin + Dashboard (KPIs, barras por dia/categoria, fila, ranking, filtros)
- [X] T035 [P] [US5] Aprovações (detalhe completo, aprovar, recusar com motivo)
- [X] T036 [P] [US5] Estabelecimentos (busca, status, suspender/reativar, destaque)
- [X] T037 [P] [US5] Usuários (filtros com contagem, bloquear/desbloquear)
- [X] T038 [P] [US5] Categorias (criar, editar, visível, reordenar)
- [X] T039 [P] [US5] Planos e Configurações (settings, cidades)

## Phase 8: US6 — PWA (P3)

- [X] T040 [US6] `src/app/manifest.ts`, ícones em `public/icons/`, `public/sw.js`, registro e banner de instalação, `/offline`

## Phase 9: Polish

- [X] T041 Rodar `lint`, `test:run`, `build` e corrigir
- [X] T042 `/security` → `security-review.md`; corrigir CRITICAL/HIGH
- [X] T043 `/review` → `code-review.md`
- [X] T044 Ajuste no backend: `.env.example` documenta `BETTER_AUTH_URL`/`TRUST_PROXY_HOPS` com o proxy do front

## Dependencies & Execution Order

Setup → Foundational → US1 → (US2 ∥ US3) → US4 → US5 → US6 → Polish. US5 depende só de Foundational.
