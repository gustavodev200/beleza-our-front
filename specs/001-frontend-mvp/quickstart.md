# Quickstart: Frontend MVP do belezaOur

1. Suba o backend (`../beleza-our-back`, ver README): `docker compose up -d db`, `npx prisma migrate dev`,
   `npm run seed`, `npm run start:dev` → `http://localhost:3333/api`.
2. No backend `.env`: `FRONTEND_URL=http://localhost:3000` e `CORS_ORIGINS=http://localhost:3000`.
   Em dev mantenha `TRUST_PROXY_HOPS=0`; em produção veja SR-F1 em `security-review.md`
   (proxy reverso na frente do Next + `TRUST_PROXY_HOPS=1`, `BETTER_AUTH_URL` = origem pública do front).
3. No front: `cp .env.example .env.local`, `npm install`, `npm run dev` → `http://localhost:3000`.
4. Validação manual por história:
   - **US1**: Início → card → perfil → Agendar → telefone `(62) 99999-0000` → código no log do backend → confirmação.
   - **US3**: `/painel/cadastro` → conta → link de verificação no log do backend (`[email:dev]`) → passos → Enviar.
   - **US5**: `/admin/entrar` com `ADMIN_EMAIL`/`ADMIN_PASSWORD` do seed → cadastrar TOTP → aprovar o cadastro.
   - **US4**: `/painel` com o dono aprovado → serviços/profissionais → agenda → balcão/bloqueio.
5. Gates: `npm run lint && npm run test:run && npm run build`.
