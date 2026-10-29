import { describe, expect, it } from "vitest";
import { daySchema, exploreParamsSchema, phoneSchema, serviceFormSchema } from "./schemas";

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
  it("pausa dentro do expediente", () => {
    expect(
      daySchema.safeParse({ weekday: 1, opensAt: "09:00", closesAt: "18:00", breakStart: "12:00", breakEnd: "13:00" })
        .success,
    ).toBe(true);
    expect(
      daySchema.safeParse({ weekday: 1, opensAt: "09:00", closesAt: "18:00", breakStart: "08:00", breakEnd: "13:00" })
        .success,
    ).toBe(false);
  });
  it("descarta query string inválida em vez de quebrar", () => {
    expect(exploreParamsSchema.parse({ categoria: "x", ordem: "hack", pagina: "-1", q: "unha" })).toEqual({
      q: "unha",
      categoria: undefined,
      ordem: undefined,
      pagina: undefined,
    });
  });
});
