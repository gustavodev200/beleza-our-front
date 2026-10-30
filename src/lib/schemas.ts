import { z } from "zod";
import { normalizeBrPhone, normalizeCpfCnpj } from "./format";

/**
 * Validação na borda (Princípio II) com as mesmas regras da API, para o
 * usuário ver o erro antes do envio. A API continua sendo a autoridade.
 */

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Informe o WhatsApp")
  .transform((value, ctx) => {
    const phone = normalizeBrPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Celular inválido. Ex.: (62) 99999-0000" });
      return z.NEVER;
    }
    return phone;
  });

export const nameSchema = z.string().trim().min(2, "Informe seu nome").max(80, "Nome muito longo");

export const otpSchema = z.string().regex(/^\d{4}$/, "Digite os 4 números do código");
export const totpSchema = z.string().regex(/^\d{6}$/, "Digite os 6 números do código");

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(254);
export const passwordSchema = z.string().min(8, "Use no mínimo 8 caracteres").max(128, "Senha muito longa");

/** Login por e-mail e senha (dono e cliente). */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

const acceptedTermsSchema = z.boolean().refine((v) => v, "Aceite os Termos de Uso e a Política de Privacidade");

export const clientSignUpSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo").max(80, "Nome muito longo"),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    acceptedTerms: acceptedTermsSchema,
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

export const cpfCnpjSchema = z
  .string()
  .trim()
  .min(1, "Informe o CPF ou CNPJ")
  .transform((value, ctx) => {
    const digits = normalizeCpfCnpj(value);
    if (!digits) {
      ctx.addIssue({ code: "custom", message: "CPF ou CNPJ inválido" });
      return z.NEVER;
    }
    return digits;
  });

export const ownerSignUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(80, "Nome muito longo"),
  email: emailSchema,
  cpfCnpj: cpfCnpjSchema,
  password: passwordSchema,
  acceptedTerms: acceptedTermsSchema,
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const timeSchema = z.string().regex(HHMM, "Use HH:MM");

export const businessDataSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do negócio").max(80),
  whatsapp: phoneSchema,
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(60),
  cityId: z.string().uuid("Escolha a cidade"),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(20).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  categoryId: z.string().uuid("Escolha a categoria"),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 min")
    .max(480, "Máximo 8h")
    .multipleOf(5, "Use múltiplos de 5 min"),
  priceCents: z.number().int().min(0, "Preço inválido").max(10_000_000, "Preço muito alto"),
  visible: z.boolean(),
});

export const professionalFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  role: z.string().trim().max(60).optional(),
  serviceIds: z.array(z.string().uuid()).max(100),
  active: z.boolean(),
});

export const daySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opensAt: timeSchema,
    closesAt: timeSchema,
    breakStart: timeSchema.optional(),
    breakEnd: timeSchema.optional(),
  })
  .superRefine((d, ctx) => {
    if (d.opensAt >= d.closesAt) ctx.addIssue({ code: "custom", message: "Abertura deve ser antes do fechamento" });
    if (Boolean(d.breakStart) !== Boolean(d.breakEnd))
      ctx.addIssue({ code: "custom", message: "Informe início e fim da pausa" });
    if (
      d.breakStart &&
      d.breakEnd &&
      !(d.opensAt <= d.breakStart && d.breakStart < d.breakEnd && d.breakEnd <= d.closesAt)
    ) {
      ctx.addIssue({ code: "custom", message: "Pausa deve estar dentro do expediente" });
    }
  });

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.enum(["PUNCTUAL", "ATTENTIVE", "CLEAN_ENVIRONMENT", "GREAT_RESULT", "FAIR_PRICE"])),
  comment: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(5, "Descreva o motivo (mín. 5 caracteres)").max(500),
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(40),
  icon: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{2,40}$/, "Nome de ícone Material Symbols (ex.: spa)"),
});

export const cityFormSchema = z.object({
  name: z.string().trim().min(2, "Informe a cidade").max(60),
  state: z.string().trim().length(2, "UF com 2 letras").toUpperCase(),
});

/** Filtros de /explore vindos da URL — nunca confiar no query string. */
export const exploreParamsSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.string().uuid().optional().catch(undefined),
  neighborhood: z.string().trim().max(60).optional().catch(undefined),
  today: z.enum(["1"]).optional().catch(undefined),
  sort: z.enum(["relevance", "distance", "rating", "price"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});
export type ExploreParams = z.infer<typeof exploreParamsSchema>;

export const uuidSchema = z.string().uuid();
export const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
