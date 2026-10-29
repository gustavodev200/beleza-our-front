# belezaOur — Frontend

Web responsiva + PWA (um único app) do belezaOur, marketplace de agendamento de serviços de beleza
(piloto em Goiânia-GO). Atende três áreas: **cliente** (busca e agenda), **painel do dono** e
**dashboard admin**. Consome a API NestJS de [`../beleza-our-back`](../beleza-our-back).

- Produto: [docs/mvp-spec.md](docs/mvp-spec.md)
- Especificação, plano, tarefas e revisões: [specs/001-frontend-mvp/](specs/001-frontend-mvp/)
- Uso da API por tela: [specs/001-frontend-mvp/contracts/api-usage.md](specs/001-frontend-mvp/contracts/api-usage.md)
- Princípios de engenharia: [.specify/memory/constitution.md](.specify/memory/constitution.md)

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript strict · Tailwind CSS 4 · Radix (diálogos
acessíveis) · TanStack Query 5 · Better Auth client 1.7 (telefone + TOTP) · Zod 4 · React Hook Form ·
Sonner · Vitest.

## Rodando localmente

Pré-requisitos: Node.js 24 e o backend rodando (`http://localhost:3333/api`, ver README dele).

```bash
cp .env.example .env.local    # API_URL e NEXT_PUBLIC_SITE_URL
npm install
npm run dev                   # http://localhost:3000
```

Em desenvolvimento o WhatsApp e o e-mail não têm provedor: o **código de acesso** e o **link de
verificação/redefinição** aparecem no log da API (`[whatsapp:dev]` e `[email:dev]`).

O admin entra em `/admin/entrar` com o `ADMIN_EMAIL`/`ADMIN_PASSWORD` do seed e cadastra o app
autenticador (TOTP) no primeiro acesso.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção (`output: standalone`) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run test:run` | Testes unitários (Vitest) |
| `npm run format` | Prettier (com ordenação de classes Tailwind) |

## Arquitetura

```text
Navegador ──/api/*──▶ Next (rewrite) ──▶ API NestJS /api      cookie de sessão same-origin
          ──páginas──▶ Next (SSR público busca a API pelo servidor, com cache de 30–300 s)
```

| Caminho | Responsabilidade |
|---|---|
| `src/app/(client)/` | Início, Explorar, perfil `/{slug}`, agendamento, meus agendamentos, favoritos, notificações, entrar, perfil, minha agenda (PWA) |
| `src/app/painel/` | Entrar, cadastro (onboarding 6 passos), status, senha; `(app)/` visão geral, agenda, serviços, profissionais, perfil público |
| `src/app/admin/` | Entrar + 2FA; `(app)/` dashboard, aprovações, estabelecimentos, usuários, categorias, planos, configurações |
| `src/components/ui/` | Design system (botões, campos, chips, toggles, badges, modal/gaveta, estados) |
| `src/lib/` | Cliente HTTP, auth, schemas Zod, formatação (fuso SP, BRL, telefone), tipos da API |
| `src/proxy.ts` | CSP com nonce por requisição + checagem otimista de sessão |
| `public/sw.js` | Service worker (offline, cache de estáticos e imagens; nunca `/api` nem HTML logado) |

### Design system

Tokens em [`src/app/globals.css`](src/app/globals.css) (`@theme`), extraídos do protótipo
`belezaOur.dc.html`: Noto Sans, Material Symbols Outlined (self-hosted), tinta `#14242b`, fundo `#f7f7f5`,
primária petróleo `oklch(0.5 0.09 210)`, acento rosé `oklch(0.6 0.13 12)` e cores de status do §10.
Cada profissional ganha uma cor derivada do nome (avatar e blocos da agenda).

## Segurança

Resumo do que o front aplica (detalhes em [security-review.md](specs/001-frontend-mvp/security-review.md)):
sessão só em cookie httpOnly same-origin, nenhum token em storage; autorização sempre da API (o `proxy.ts`
só evita mostrar tela protegida a quem não tem cookie); CSP com nonce + `strict-dynamic`; HSTS, `DENY` em
frames, `nosniff`; `next=` protegido contra open redirect; Zod em todo formulário e parâmetro de URL; SW
sem cache de dados pessoais; logout limpa caches.

### Deploy — obrigatório

- **Proxy reverso na frente do Next** (Nginx/Caddy/LB) sobrescrevendo ou anexando `X-Forwarded-For`, e
  `TRUST_PROXY_HOPS=1` na API. O Next repassa esse cabeçalho como recebeu; sem o proxy, um cliente poderia
  forjar o IP e contornar o rate limit por IP.
- Na API: `BETTER_AUTH_URL` = origem pública do front; `FRONTEND_URL`/`CORS_ORIGINS` = mesma origem.
- No front: `API_URL` aponta para a API pela rede interna (nunca exposta ao navegador) e
  `NEXT_PUBLIC_SITE_URL` = origem pública.

## Variáveis de ambiente

Ver [.env.example](.env.example). Nunca versione `.env*` com valores reais (o `.gitignore` bloqueia).
