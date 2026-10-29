# Implementation Plan: Frontend MVP do belezaOur

**Branch**: `001-frontend-mvp` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-frontend-mvp/spec.md`

## Summary

App único Next.js (App Router) que serve as três áreas — cliente (web + PWA), painel do dono e
dashboard admin — consumindo a API NestJS existente. A API é chamada pela mesma origem (`/api/*`
reescrito para o backend), então a sessão do Better Auth fica em cookie httpOnly sem CORS. Páginas
públicas são Server Components com SEO; áreas logadas são Client Components com TanStack Query.
Design system próprio, extraído do protótipo `belezaOur.dc.html`.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js 24

**Primary Dependencies**: Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind CSS 4,
`radix-ui` (Dialog/Popover acessíveis), `class-variance-authority` + `tailwind-merge`,
TanStack Query 5, Better Auth client 1.7.14 (mesma versão do backend; plugins `phoneNumber` e
`twoFactor`), Zod 4, React Hook Form 7, Sonner (toasts), `qrcode` (TOTP do admin), `material-symbols` (ícones self-hosted), Prettier

**Storage**: nenhum no front (estado do servidor via TanStack Query; preferências locais mínimas
— banner do PWA dispensado — em `localStorage` com try/catch)

**Testing**: Vitest + Testing Library (utilitários de data/dinheiro/telefone, validação Zod,
open-redirect, mapeamento de erros); `next build` + `eslint` como gate

**Target Platform**: navegadores modernos, mobile-first; PWA instalável (Android/iOS/desktop)

**Project Type**: web application (frontend; backend em repositório irmão)

**Performance Goals**: LCP < 2,5s em 4G nas páginas públicas (SSR + `next/image` + fonte self-hosted)

**Constraints**: alvos ≥ 44px, AA, fuso `America/Sao_Paulo`, CSP com nonce, sem token em storage

**Scale/Scope**: ~35 rotas em 3 áreas

## Constitution Check

| Princípio | Status |
|---|---|
| I. Stack declarada | ✅ `project.config.json` (preset `prisma-postgres`, frontend `nextjs`, auth `better-auth`) |
| II. Zod na borda | ✅ todo formulário e query param (`/explorar`, `next=`) validado com schemas em `src/lib/schemas.ts` |
| III. Autorização no servidor | ✅ a API decide; front só faz checagem otimista no `proxy.ts` e trata 401/403 |
| IV. RLS | N/A (preset Prisma; front não acessa banco) |
| V. Segurança antes do review | ✅ `security-review.md` antes de `code-review.md` |
| VI. YAGNI | ✅ sem Zustand (Query + estado local bastam), sem Storybook, sem camada de repositório |
| VII. Rastreabilidade | ✅ spec/plan/tasks/security-review/code-review nesta pasta |

## Decisões de marca (design system)

- **Fonte**: Noto Sans 400–800 via `next/font/google` (self-host, sem request externo).
- **Ícones**: Material Symbols Outlined (exigência do produto §10) — troca do padrão `lucide-react`
  registrada aqui. Carregada via `next/font/google` (eixos FILL/wght) para manter CSP `font-src 'self'`.
- **Tokens** (CSS variables em `src/app/globals.css`, expostos ao Tailwind via `@theme`):
  tinta `#14242b`, fundo `#f7f7f5`, superfície `#fff`, texto 2º `#66737a`, linha `#e6e9ea`,
  primária `oklch(0.5 0.09 210)` (hover `0.44`), acento rosé `oklch(0.6 0.13 12)`, estrela `#f5a524`,
  status confirmado/pendente/cancelado/concluído conforme §10. Raios 10–24px, sombras suaves.
- **Cor por profissional**: matiz derivada do nome (hash → 0–359) em `oklch(0.92 0.04 h)` /
  `oklch(0.38 0.1 h)` / `oklch(0.58 0.15 h)`, como no protótipo.
- **Capa sem imagem**: listras diagonais `oklch(0.9 0.035 h)` com matiz do nome do estabelecimento.

## Arquitetura

```text
Navegador ──/api/*──▶ Next (rewrite) ──▶ NestJS :3333/api   (cookies same-origin)
         ──páginas──▶ Next (SSR público com fetch server-side direto em API_URL)
```

- **`src/proxy.ts`**: CSP com nonce + checagem otimista do cookie `belezaour.session_token`
  (`getSessionCookie` com `cookiePrefix: "belezaour"`) para `/agendamentos`, `/favoritos`,
  `/notificacoes`, `/perfil`, `/minha-agenda`, `/painel/*` (menos entrar/cadastro/senha) e `/admin/*`
  (menos entrar). Sem cookie → login da área com `next=`.
- **`src/lib/api.ts`**: `fetch` com `credentials: "include"`, erro tipado `ApiError { status, code,
  message, errors }`; 401 dispara redirecionamento ao login da área.
- **`src/lib/auth-client.ts`**: `createAuthClient({ basePath: "/api/auth", plugins: [phoneNumberClient(),
  twoFactorClient()] })`.
- **Guards de área** (client): `RequireRole` lê `GET /api/me` e redireciona se o papel não bate.
- **Áreas** (route groups): `(client)` com header web + tab bar mobile; `painel/(app)` com sidebar
  escura; `admin/(app)` com sidebar escura e selo ADMIN; telas de entrada sem shell.

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend-mvp/
├── spec.md · plan.md · research.md · quickstart.md · tasks.md
├── contracts/api-usage.md
├── security-review.md · code-review.md   (pós-implementação)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (client)/            # home, explorar, [slug], [slug]/agendar, agendamentos, favoritos,
│   │                        # notificacoes, entrar, perfil, minha-agenda
│   ├── painel/              # entrar, cadastro, esqueci-senha, redefinir-senha, status, (app)/...
│   ├── admin/               # entrar, (app)/...
│   ├── offline/  manifest.ts  robots.ts  sitemap.ts  layout.tsx  globals.css  not-found.tsx
├── components/
│   ├── ui/                  # Button, Input, Field, Chip, Toggle, Badge, Card, Dialog, Sheet, Tabs,
│   │                        # Icon, Avatar, Stars, Empty/Error/Loading states
│   ├── client/ owner/ admin/ pwa/
├── lib/                     # api, auth-client, format (data/dinheiro/telefone), schemas, types,
│                            # queries (hooks TanStack), errors, safe-redirect, colors
└── proxy.ts
public/  sw.js  icons/
```

**Structure Decision**: um app Next na raiz do repositório `beleza-our-front`; componentes por área.

## Complexity Tracking

| Exceção | Por quê | Alternativa rejeitada |
|---|---|---|
| Material Symbols em vez de lucide | Exigência explícita de identidade visual (§10) | lucide quebraria a fidelidade ao protótipo |
| Rewrite `/api` no Next | Cookie httpOnly same-origin, sem CORS com credenciais, sem token em JS | Chamar a API em outra origem exigiria `SameSite=None` e CORS com credenciais |
