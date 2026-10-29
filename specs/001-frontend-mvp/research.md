# Research: Frontend MVP do belezaOur

## R1 — Como o navegador fala com a API

- **Decision**: rewrite do Next `/api/:path*` → `${API_URL}/api/:path*`. SSR público chama `API_URL`
  direto do servidor.
- **Rationale**: Better Auth usa cookie httpOnly; na mesma origem não há CORS com credenciais nem
  `SameSite=None`. O Origin enviado é o do front, que já está em `CORS_ORIGINS`/`trustedOrigins`.
- **Consequências**: o backend precisa (a) `BETTER_AUTH_URL` = origem pública do front em produção,
  para que links de e-mail voltem pela mesma origem; (b) `TRUST_PROXY_HOPS` contar o Next como um hop,
  para o rate limit enxergar o IP real (o rewrite repassa `x-forwarded-for`).
- **Alternatives**: chamar a API em subdomínio próprio (cookies cross-site, mais superfície).

## R2 — Checagem de sessão no edge

- **Decision**: `proxy.ts` (Next 16) com `getSessionCookie(request, { cookiePrefix: "belezaour" })`
  — só presença do cookie. Papel e validade vêm da API (`/api/me`, 401/403).
- **Rationale**: decisão real de autorização é do backend (Princípio III); o proxy só evita flash de tela.

## R3 — Estado e dados

- **Decision**: TanStack Query para tudo que vem da API; estado de formulário com React Hook Form +
  Zod; sem store global.
- **Rationale**: cache por chave, invalidação após mutações, retry e estados de loading/erro prontos.

## R4 — Agendamento sem cadastro

- **Decision**: passo 5 com nome + WhatsApp → `phoneNumber.sendOtp` → código → `phoneNumber.verify`
  (cria sessão) → `POST /appointments`. Se já logada com telefone verificado, pula o código.
- **Rationale**: `createFromApp` exige `phoneNumberVerified`.

## R5 — Fuso e formatação

- **Decision**: `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })` para exibir;
  datas de calendário (`YYYY-MM-DD`) calculadas no fuso de SP via `Intl` (sem libs extras).

## R6 — PWA

- **Decision**: `app/manifest.ts` + `public/sw.js` escrito à mão (mesmo padrão do projeto
  MeuAluguel): navegação network-only com fallback `/offline`, estáticos cache-first, imagens SWR,
  nunca HTML autenticado nem `/api`. Registro do SW só em produção; atualização sem `skipWaiting`
  automático.
- **Alternatives**: Serwist/next-pwa (dependência a mais para o mesmo resultado).

## R7 — Ícones e fonte

- **Decision**: `next/font/google` para Noto Sans e Material Symbols Outlined (self-host).
- **Rationale**: CSP `font-src 'self'`, sem dependência de rede externa no PWA offline.

## R8 — TOTP do admin

- **Decision**: `twoFactor.enable({ password })` → `totpURI` → QR com `qrcode` (gerado no cliente, sem
  serviço externo) → `twoFactor.verifyTotp({ code })`. Login: `signIn.email` → `twoFactorRedirect` →
  tela do código → `twoFactor.verifyTotp`.
