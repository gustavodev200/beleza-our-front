# Feature Specification: Frontend MVP do belezaOur (web responsiva + PWA)

**Feature Branch**: `001-frontend-mvp`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Implementar todo o frontend do belezaOur (web responsiva + PWA, um único app) com design system baseado no protótipo `belezaOur.dc.html`, conectado ao backend já implementado em `../beleza-our-back` — todas as rotas e regras de negócio, com segurança."

Fonte de verdade do produto: [docs/mvp-spec.md](../../docs/mvp-spec.md). Contrato da API:
`../beleza-our-back/specs/001-backend-mvp/contracts/api.md`. Referência visual:
`../navega-o-web-e-pwa-belezaja/project/belezaOur.dc.html`.

## Clarifications

### Session 2026-10-29

Sessão conduzida de forma autônoma (usuário ausente, delegou as decisões). Cada resposta segue o
backend já implementado, que é a autoridade das regras.

- Q: Onde a cliente confirma o telefone se ela agenda "sem cadastro"? → A: No passo 5 do agendamento,
  inline: nome + WhatsApp → código de 4 dígitos → reserva. O backend exige telefone verificado
  (`PHONE_NOT_VERIFIED`); "sem cadastro" significa sem senha e sem tela separada.
- Q: Senha mínima do dono (spec do produto diz 6)? → A: 8 caracteres — é o que o backend aplica
  (`minPasswordLength: 8`). O front valida o mesmo para não prometer o que a API recusa.
- Q: O onboarding do dono exige e-mail confirmado? → A: Sim. O backend bloqueia login sem e-mail
  verificado. Passo 1 cria a conta e mostra "confirme seu e-mail"; o link volta ao onboarding já
  logado (`autoSignInAfterVerification`) e os passos 2–6 seguem.
- Q: Upload de foto da profissional? → A: Fora do MVP do front: a API só aceita `photoUrl` https;
  o card usa iniciais com cor derivada do nome (como no protótipo).
- Q: Planos (Grátis/Pro) e troca de plano? → A: A API não tem modelo de plano (MVP só Free). A tela
  Planos mostra os dois planos de forma informativa e edita o único parâmetro real
  (`maxActiveProfessionals`, limite do Grátis). "Trocar plano" fica fora.
- Q: Distância nos cards? → A: Só quando a cliente permitir localização (ordenar "mais perto");
  sem permissão, o card omite a distância.
- Q: Domínio do link público? → A: `{origem do app}/{slug}` (ex.: `belezaour.app/studio-bella`).
- Q: Admin sem 2FA ativado? → A: Após login, o front detecta `MFA_ENROLLMENT_REQUIRED` e leva ao
  cadastro do TOTP (QR + código) antes do dashboard.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente encontra e agenda um horário (Priority: P1)

A cliente abre o app (web ou PWA instalado), busca por serviço/categoria, abre o perfil do
estabelecimento e agenda em uma única tela em passos (serviço → profissional → data → horário →
nome + WhatsApp com código), vendo só horários realmente livres. Recebe a confirmação na tela.

**Why this priority**: é a razão de existir do marketplace; sem isso não há valor para nenhum lado.

**Independent Test**: com um estabelecimento ativo no backend, sair da home, chegar ao perfil, agendar
com um telefone novo e ver a tela "Horário confirmado!" e o agendamento em "Meus agendamentos".

**Acceptance Scenarios**:

1. **Given** a home, **When** a cliente toca num chip de horário de um card em destaque, **Then** o
   agendamento abre com serviço e horário já selecionados.
2. **Given** o passo de horário, **When** o horário é reservado por outra pessoa antes da confirmação
   (`409 SLOT_TAKEN`), **Then** aparece o aviso "Esse horário acabou de ser reservado", a lista é
   recarregada e a seleção de horário é limpa.
3. **Given** dados incompletos, **Then** o botão de confirmar fica desabilitado com a dica do que falta.
4. **Given** uma cliente não logada, **When** informa nome + WhatsApp, **Then** recebe o código, digita
   e a reserva é criada na sequência, sem outra tela.
5. **Given** um slug pendente/suspenso, **Then** o perfil mostra "Estabelecimento indisponível".

---

### User Story 2 - Cliente gerencia seus agendamentos (Priority: P1)

Lista Próximos/Histórico, remarcar (mesmo fluxo com título "Remarcar horário"), cancelar com confirmação
inline respeitando o prazo, avaliar atendimento concluído (estrelas, tags, texto), agendar novamente;
favoritos, notificações (badge no sino, marcar lidas ao abrir), perfil com LGPD (exportar, excluir conta).

**Independent Test**: com um agendamento futuro e um concluído, cancelar o futuro e avaliar o concluído.

**Acceptance Scenarios**:

1. **Given** cancelamento fora do prazo, **Then** a mensagem `CANCELLATION_WINDOW_CLOSED` é exibida.
2. **Given** rota protegida acessada sem sessão, **Then** vai para `/entrar?next=<rota>` e volta após o login.
3. **Given** um atendimento já avaliado, **Then** mostra "Você avaliou ★★★★★" e não abre o modal.

---

### User Story 3 - Dono cadastra o estabelecimento e acompanha a aprovação (Priority: P1)

Tela dividida de entrada; onboarding de 6 passos com barra de progresso e validação por passo
(conta → tipo → dados → serviços sugeridos → horários → capa e logo) e "Enviar para aprovação";
tela de status (em análise / aprovado / ajustes necessários com motivo e reenviar).

**Independent Test**: criar conta, confirmar e-mail (link do log em dev), completar os passos, enviar e
ver "Em análise".

**Acceptance Scenarios**:

1. **Given** `BUSINESS_INCOMPLETE`, **Then** a lista do que falta aparece no passo final.
2. **Given** status ≠ `ACTIVE`, **When** o dono acessa `/painel/agenda`, **Then** é levado ao status.

---

### User Story 4 - Dono opera a agenda (Priority: P2)

Visão geral (cards do dia, agenda de hoje, novos e pendentes com Confirmar), Agenda Semana/Dia com
filtro por profissional, blocos por status, sobreposição lado a lado, gaveta de detalhes com ações;
Novo agendamento (balcão, só horários livres); Bloquear horário com aviso de conflitos; Serviços (CRUD +
toggle visível); Profissionais (CRUD, vincular serviços, desativar, "Ver agenda"); Perfil público (capa,
logo, dados, horários, link com copiar/WhatsApp/Instagram/ver como cliente); Minha agenda (PWA).

**Independent Test**: com estabelecimento ativo, criar agendamento de balcão, bloquear um período e
confirmar/concluir um agendamento pela gaveta.

---

### User Story 5 - Super Admin modera e opera a plataforma (Priority: P2)

Login com e-mail + senha + TOTP (com cadastro do TOTP na primeira vez), dashboard com KPIs, gráfico por
dia e por categoria, fila e ranking, filtro de cidade e período; Aprovações (aprovar / recusar com
motivo); Estabelecimentos (suspender/reativar, destaque); Usuários (filtros com contagem,
bloquear/desbloquear exceto admins); Categorias (criar, editar, visível, reordenar); Planos;
Configurações (prazo de cancelamento, lembretes, avaliação, cidades).

**Independent Test**: aprovar um estabelecimento pendente e vê-lo aparecer em Explorar.

---

### User Story 6 - PWA instalável e resiliente (Priority: P3)

Manifest, ícones, service worker, banner "Instale o belezaOur" dispensável, tela offline, barra de abas
inferior no mobile (Início, Explorar, Agendamentos, Favoritos, Perfil).

**Independent Test**: Lighthouse PWA instalável; navegação offline mostra a tela offline.

### Edge Cases

- Sessão expirada no meio de uma ação → 401 leva ao login correto da área (cliente/dono/admin).
- `ADMIN_SESSION_EXPIRED` (8h) → volta ao login do admin com aviso.
- `ACCOUNT_BLOCKED` → mensagem e logout.
- Limite de envio de código (429) → mensagem "Muitas tentativas" e contador para reenviar (30s).
- Lista vazia, carregando e erro em toda lista (com "Tentar novamente").
- `PROFESSIONAL_LIMIT_REACHED`, `INVALID_IMAGE`, `INVALID_TRANSITION`, `APPOINTMENT_NOT_STARTED`,
  `LOCATION_REQUIRED` → mensagens da API exibidas em toast.
- Dia fechado desabilitado na faixa de 7 dias; horário passado nunca aparece (vem da API).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app MUST implementar todas as telas do mapa do produto (§9 de docs/mvp-spec.md) para as três áreas.
- **FR-002**: Toda chamada MUST ir para a API do backend via mesma origem (`/api/*`); o front não acessa banco nem segredos.
- **FR-003**: Toda entrada de formulário e todo query param MUST ser validado com Zod antes de chamar a API, com as mesmas regras do backend (telefone BR, senha ≥ 8, duração múltipla de 5, etc.).
- **FR-004**: Esconder UI não é proteção: o front MUST tratar 401/403 da API como autoridade final; o `proxy.ts` faz só checagem otimista do cookie de sessão.
- **FR-005**: Sessão MUST usar exclusivamente cookies httpOnly do Better Auth; nenhum token em `localStorage`.
- **FR-006**: O front MUST enviar CSP com nonce por requisição e cabeçalhos de segurança (HSTS, nosniff, frame DENY, Referrer-Policy, Permissions-Policy).
- **FR-007**: Redirecionamentos pós-login (`next=`) MUST aceitar só caminhos relativos internos (sem open redirect).
- **FR-008**: Páginas públicas (home, explorar, perfil por slug) MUST ser renderizadas no servidor com metadados SEO e Open Graph.
- **FR-009**: Toda lista MUST ter estados de carregamento, vazio e erro; toda ação MUST ter toast de retorno.
- **FR-010**: Mobile-first, alvos de toque ≥ 44px, foco visível, Esc fecha modais, contraste AA.
- **FR-011**: Datas/horas MUST ser exibidas em `America/Sao_Paulo`; dinheiro vem em centavos e é formatado em BRL.
- **FR-012**: O service worker MUST nunca armazenar HTML autenticado nem respostas `/api` privadas.
- **FR-013**: Filtros de Explorar MUST refletir na URL.

### Key Entities

Espelham a API (sem persistência no front): BusinessCard, BusinessProfile, Slot, Appointment
(cliente/dono), Service, Professional, TimeBlock, Review, Favorite, Notification, OwnerBusiness,
AdminDashboard, PlatformSettings, Category, City, User.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cliente nova agenda a partir da home em ≤ 6 toques além da digitação de nome/telefone/código.
- **SC-002**: `npm run build` e `npm run lint` passam sem erros; testes unitários passam.
- **SC-003**: Nenhum arquivo de segredo versionado (`git ls-files` limpo); `.env*` ignorado.
- **SC-004**: Todas as telas utilizáveis em 360px de largura sem rolagem horizontal da página.
- **SC-005**: LCP < 2,5s nas páginas públicas (pré-renderizadas, imagens otimizadas).

## Assumptions

- Backend rodando em `http://localhost:3333` em dev (README do backend); em produção, o front e a API
  ficam atrás do mesmo domínio público via rewrite, e `BETTER_AUTH_URL` do backend aponta para a origem
  pública do front.
- WhatsApp ainda sem provedor: em dev o código OTP aparece no log do backend.
- Pagamento, cobrança de planos, push notifications e app nativo estão fora do MVP.
