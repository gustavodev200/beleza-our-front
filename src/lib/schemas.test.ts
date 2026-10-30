import { describe, expect, it } from "vitest";
import { clientSignUpSchema, daySchema, exploreParamsSchema, phoneSchema, serviceFormSchema } from "./schemas";

describe("schemas", () => {
  it("telefone vira E.164", () => {
    expect(phoneSchema.parse("(62) 99999-0000")).toBe("+5562999990000");
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });
  it("duração múltipla de 5", () => {
    const base = { name: "Corte", categoryId: "4f6b1c8e-1d2a-4c3b-9a8e-1234567890ab", priceCents: 1000, visible: true };
    expect(serviceFormSchema.safeParse({ ...base, durationMinutes: 45 }).success).toBe(true);
    expect(serviceFormSchema.safeParse({ ...base, durationMinutes: 47 }).success).toBe(false);
  });
  it("pausas dentro do expediente e sem sobreposição", () => {
    const day = (breaks: { start: string; end: string }[]) =>
      daySchema.safeParse({ weekday: 1, opensAt: "09:00", closesAt: "18:00", breaks }).success;
    expect(day([])).toBe(true);
    expect(day([{ start: "12:00", end: "13:00" }, { start: "15:00", end: "15:30" }])).toBe(true);
    expect(day([{ start: "08:00", end: "13:00" }])).toBe(false);
    expect(day([{ start: "12:00", end: "13:00" }, { start: "12:30", end: "14:00" }])).toBe(false);
  });
  it("cadastro da cliente exige senhas iguais e aceite dos termos", () => {
    const base = {
      name: "Maria Silva",
      email: "Maria@Exemplo.com ",
      password: "senha-forte-1",
      confirm: "senha-forte-1",
      acceptedTerms: true,
    };
    expect(clientSignUpSchema.parse(base).email).toBe("maria@exemplo.com");
    const mismatch = clientSignUpSchema.safeParse({ ...base, confirm: "outra-senha" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0].path).toEqual(["confirm"]);
    expect(clientSignUpSchema.safeParse({ ...base, acceptedTerms: false }).success).toBe(false);
    expect(clientSignUpSchema.safeParse({ ...base, password: "curta", confirm: "curta" }).success).toBe(false);
  });
  it("descarta query string inválida em vez de quebrar", () => {
    expect(exploreParamsSchema.parse({ category: "x", sort: "hack", page: "-1", q: "unha" })).toEqual({
      q: "unha",
      category: undefined,
      sort: undefined,
      page: undefined,
    });
  });
});
