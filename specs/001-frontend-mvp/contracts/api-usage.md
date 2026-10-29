# Contrato de uso da API pelo frontend

Contrato da API: `../beleza-our-back/specs/001-backend-mvp/contracts/api.md` (autoridade). Este arquivo
mapeia **tela → chamada** e as regras de tratamento de erro no front.

## Convenções

- Base no navegador: `/api` (mesma origem, reescrita para o backend). Base no SSR: `API_URL + /api`.
- Erro: `{ statusCode, code?, message, errors?[] }` → `ApiError`. Mensagem exibida = `message` da API
  (já em português e sem detalhe interno); `errors[]` de `VALIDATION_ERROR` marca campos.
- 401 `UNAUTHENTICATED` / `ADMIN_SESSION_EXPIRED` → login da área com `next=`.
- 403 `ACCOUNT_BLOCKED` → logout + aviso. 403 `MFA_ENROLLMENT_REQUIRED` → `/admin/entrar?etapa=2fa-setup`.
- 403 `BUSINESS_NOT_ACTIVE` em rota operacional do painel → `/painel/status`.
- Dinheiro em centavos; instantes ISO UTC; `date` `YYYY-MM-DD` no calendário de SP.

## Cliente

| Tela | Chamadas |
|---|---|
| Início | SSR `GET /categories`, `GET /businesses/featured` |
| Explorar | SSR `GET /businesses?q&categoryId&neighborhood&availableToday&sort&lat&lng&page` (filtros na URL) |
| Perfil `/{slug}` | SSR `GET /businesses/:slug` (ISR 60s, 404 → indisponível); `GET /businesses/:slug/reviews` |
| Agendar | `GET /businesses/:slug` · `GET /businesses/:slug/availability?serviceId&date&professionalId` · auth `phone-number/send-otp` + `verify` · `POST /appointments` (409 `SLOT_TAKEN` → recarrega slots) |
| Remarcar | `GET /me/appointments/:id` · availability · `PATCH /me/appointments/:id/reschedule` |
| Confirmação | `GET /me/appointments/:id` |
| Meus agendamentos | `GET /me/appointments?scope=upcoming|history` · `POST .../cancel` · `POST .../review` |
| Favoritos | `GET /me/favorites` · `PUT|DELETE /me/favorites/:businessId` |
| Notificações | `GET /me/notifications` · `GET .../unread-count` · `POST .../read` |
| Perfil | `GET|PATCH /me` · `GET /me/export` · `DELETE /me` · `POST /auth/sign-out` |
| Minha agenda (PWA) | `GET /owner/agenda?from&to` · `POST /owner/appointments/:id/confirm` |

## Dono

| Tela | Chamadas |
|---|---|
| Entrar | `POST /auth/sign-in/email` (403 e-mail não verificado → reenviar `send-verification-email`) |
| Esqueci / redefinir | `POST /auth/request-password-reset { email, redirectTo }` · `POST /auth/reset-password` |
| Onboarding | `POST /auth/sign-up/email { callbackURL: /painel/cadastro }` · `GET /cities` · `GET /categories` · `POST|PATCH /owner/business` · `POST /owner/services` · `POST /owner/professionals` · `PUT /owner/business/hours` · `POST /owner/business/cover|logo` · `POST /owner/business/submit` |
| Status | `GET /owner/business` |
| Visão geral | `GET /owner/overview` · ações |
| Agenda | `GET /owner/agenda` · `GET /owner/appointments/:id` · `POST /owner/appointments/:id/{action}` · `DELETE /owner/blocks/:id` |
| Novo (balcão) | `GET /owner/services` · `GET /owner/professionals` · `GET /owner/availability` · `POST /owner/appointments` |
| Bloquear | `POST /owner/blocks` (mostra `conflicts[]`) |
| Serviços | `GET|POST /owner/services` · `PATCH|DELETE /owner/services/:id` |
| Profissionais | `GET|POST /owner/professionals` · `PATCH /owner/professionals/:id` |
| Perfil público | `GET|PATCH /owner/business` · `PUT /owner/business/hours` · `POST cover|logo` |

## Admin

| Tela | Chamadas |
|---|---|
| Entrar | `sign-in/email` → `twoFactorRedirect` → `two-factor/verify-totp`; 1º acesso: `two-factor/enable` + `verify-totp` |
| Dashboard | `GET /admin/dashboard?cityId&from&to` · `GET /admin/cities` |
| Aprovações | `GET /admin/businesses?status=PENDING` · `GET /admin/businesses/:id` · `POST approve|reject` |
| Estabelecimentos | `GET /admin/businesses?status&q` · `POST suspend|reactivate` · `PATCH featured` |
| Usuários | `GET /admin/users?role&q` · `POST block|unblock` |
| Categorias | `GET|POST /admin/categories` · `PATCH /admin/categories/:id` · `PUT /admin/categories/order` |
| Planos / Config. | `GET|PATCH /admin/settings` · `GET|POST /admin/cities` · `PATCH /admin/cities/:id` |
