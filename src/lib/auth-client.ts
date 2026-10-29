"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";

/**
 * Better Auth na mesma origem (/api/auth reescrito para a API). A sessão vive
 * em cookie httpOnly; este cliente nunca lê nem guarda tokens.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    phoneNumberClient(),
    twoFactorClient(),
    // Espelha o campo extra do usuário declarado na API (better-auth.ts).
    inferAdditionalFields({ user: { cpfCnpj: { type: "string", required: false } } }),
  ],
});
