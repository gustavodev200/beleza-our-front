# Security Review: Frontend MVP do belezaOur

- **Plan relacionado**: `plan.md`
- **Status**: Aprovado com ressalvas (requisito de deploy registrado em SR-F1)

Processo: `.claude/skills/security/references/pre-deploy-gate.md`. Revisão feita sobre o código em `src/`,
`public/sw.js`, `next.config.ts` e no comportamento real contra a API local (testes E2E pelo proxy do Next,
29/10/2026 — ver "Evidência de execução").

## Escopo da alteração

- Feature: frontend completo (cliente web/PWA, painel do dono, dashboard admin) consumindo a API NestJS.
- Componentes: `src/proxy.ts` (CSP + checagem otimista de sessão), `next.config.ts` (rewrite `/api`, headers),
  `src/lib/api.ts` (cliente HTTP), `src/lib/auth-client.ts` (Better Auth), `src/lib/safe-redirect.ts`,
  formulários com Zod (`src/lib/schemas.ts`), upload de capa/logo, `public/sw.js`.
- Blast radius: o front não tem banco nem segredos; toda autorização é da API. O rewrite `/api` muda de onde a
  API vê o IP do cliente (ver SR-F1). Mudança no backend: `email.service.ts` passa a logar o link do e-mail
  **somente** com `NODE_ENV=development` e sem provedor configurado.

## Achados

```text
SR-F1
Vulnerabilidade: IP do cliente forjável via X-Forwarded-For se o Next ficar exposto direto à internet
Severidade: MEDIUM (HIGH se implantado sem proxy reverso na frente do Next)
Arquivo: next.config.ts (rewrite) / backend main.ts (trust proxy)
Linha: rewrites()
Componente/Endpoint: /api/* → API (rate limit por IP do Better Auth e do Throttler)
Evidência: CONFIRMADO no código do Next 16.4 (base-server.js: `x-forwarded-for ??= socket.remoteAddress`,
  sem anexar) — o cabeçalho enviado pelo cliente é repassado como está.
Como pode ser explorada: com o Next como borda e TRUST_PROXY_HOPS=1, o atacante envia X-Forwarded-For
  aleatório a cada requisição e cada tentativa cai num "IP" novo, contornando o limite por IP de OTP/login.
  (Os limites por telefone e por conta continuam valendo.)
Impacto: enfraquece a defesa contra força bruta/spam de OTP por IP.
Correção recomendada: em produção, sempre um proxy reverso (Nginx/Caddy/LB) na frente do Next que
  sobrescreva ou anexe X-Forwarded-For com o IP real, e TRUST_PROXY_HOPS=1 na API (o Next não anexa hop).
  Em dev, manter TRUST_PROXY_HOPS=0. Documentado no README e no quickstart.
Como validar a correção: atrás do proxy, enviar `X-Forwarded-For: 1.2.3.4` e conferir no log/rate limit
  da API que o IP considerado é o real.
```

```text
SR-F2
Vulnerabilidade: style-src com 'unsafe-inline'
Severidade: LOW
Arquivo: src/proxy.ts
Linha: buildCsp()
Componente/Endpoint: todas as páginas
Evidência: CONFIRMADO (decisão de projeto)
Como pode ser explorada: só amplia o impacto de uma injeção de HTML já existente (CSS injection); não executa script.
Impacto: baixo — scripts exigem nonce por requisição + 'strict-dynamic'.
Correção recomendada: aceitar; cores por profissional e posição dos blocos da agenda usam o atributo style.
Como validar a correção: n/a
```

```text
SR-F3
Vulnerabilidade: link de verificação/reset de e-mail no log da API em desenvolvimento
Severidade: INFORMATIONAL
Arquivo: ../beleza-our-back/src/integrations/email/email.service.ts
Linha: send()
Evidência: CONFIRMADO — condicionado a NODE_ENV=development e ausência de RESEND_API_KEY (em produção o
  RESEND_API_KEY é obrigatório e a API não sobe sem ele). Mesmo padrão já usado para o OTP do WhatsApp.
Correção recomendada: nenhuma; necessário para concluir o cadastro do dono localmente.
```

## Checklist por tópico

### Autenticação e Autorização — Resolvido

- Sessão só em cookie httpOnly do Better Auth (same-origin pelo rewrite); nenhum token em `localStorage`.
- `proxy.ts` faz só checagem otimista do cookie; papel, bloqueio, 2FA e posse são da API. E2E confirmou:
  cliente → `/api/owner/*` = 403; dono → `/api/admin/*` = 403; cliente B não lê agendamento de A (404);
  sem sessão = 401.
- 401/`ADMIN_SESSION_EXPIRED`/`ACCOUNT_BLOCKED`/`MFA_ENROLLMENT_REQUIRED` levam ao login da área correta.
- Open redirect: `next=` passa por `safeRedirect` (testado: `//evil`, `https://`, `\`, `javascript:`,
  controle). Pós-login do dono só aceita `/painel*` e `/minha-agenda`; admin só `/admin*`.
- Login do dono/admin verifica o papel via `/api/me` e encerra a sessão se não bater.
- Admin: TOTP obrigatório; cadastro com QR gerado localmente (sem serviço externo); códigos de recuperação
  só exibidos na hora do cadastro.
- Logout limpa cache do TanStack Query e caches do service worker.

### Injection (XSS, CSRF, SSRF, Path Traversal) — Resolvido

- React escapa todo conteúdo; único `dangerouslySetInnerHTML` é o JSON-LD do perfil, com `<` escapado e nonce.
- CSP com nonce por requisição + `'strict-dynamic'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri`/`form-action 'self'` (confirmado: 17 scripts com o nonce da resposta).
- Parâmetros que viram caminho da API são validados: slug por regex (`/[slug]`, `/[slug]/agendar`), ids por
  `uuid` (remarcar, confirmação, `?profissional=`), filtros de `/explorar` por Zod com `.catch()`.
- Links externos com `rel="noopener noreferrer"`; `wa.me` monta só dígitos; `.ics` escapa `;`, `,` e `\`.
- CSRF: tudo é same-origin; mutações do Better Auth checam `Origin` contra `trustedOrigins`.

### API: Rate limiting, CORS, Headers — Resolvido com ressalva (SR-F1)

- Headers: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
  (`geolocation=(self)` só para "mais perto"), `poweredByHeader: false`.
- CORS deixa de ser necessário para o navegador (same-origin).
- Rate limit por IP depende de SR-F1 em produção.

### Secrets, Exposição de Dados, Logs, Dependências — Resolvido

- `.gitignore` cobre `.env*` (exceto `.env.example`), chaves e builds — verificado com `git check-ignore`;
  backend também conferido (só `.env.example` versionado).
- `API_URL` é variável de servidor (nunca `NEXT_PUBLIC_`). Nenhum segredo no bundle.
- Service worker nunca intercepta `/api/*` nem guarda HTML autenticado; respostas `private`/`no-store` não
  entram em cache. Páginas protegidas recebem `Cache-Control: private, no-store`.
- `npm audit --omit=dev`: 0 vulnerabilidades.

### Upload de Arquivos — Resolvido

- Front limita a JPEG/PNG/WebP e 5 MB antes do envio; a API revalida pelo conteúdo (magic bytes).

### RLS no Supabase — Não aplicável (preset Prisma; front não acessa banco)

## Evidência de execução

E2E pelo proxy do Next (`localhost:3000/api` → API `:3333`): 43 verificações, todas PASS — cadastro do dono,
login bloqueado sem verificação, verificação, onboarding, envio, agenda bloqueada antes da aprovação,
pendente invisível; OTP de cliente, reserva, conflito `409 SLOT_TAKEN`, isolamento entre clientes,
cancelamento libera horário; balcão, bloqueio com conflito, transições inválidas, cancelar/reabrir;
SSR do perfil com OG e JSON-LD.

## Riscos aceitos explicitamente

- SR-F2 (`style-src 'unsafe-inline'`): aceito por decisão de projeto (estilos dinâmicos), registrado aqui pelo
  agente na execução autônoma — revisar com o responsável.
- SR-F1 vira requisito de deploy (não corrigível no código do front sem conhecer a topologia).

## Security Gate

```text
Status: PASS WITH WARNINGS

CRITICAL: 0
HIGH: 0   (SR-F1 é HIGH apenas se o deploy ignorar o requisito documentado)
MEDIUM: 1
LOW: 1
INFORMATIONAL: 1
```
