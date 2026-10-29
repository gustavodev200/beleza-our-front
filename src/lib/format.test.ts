import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDuration,
  formatMoney,
  formatPhone,
  formatTime,
  localDate,
  maskPhoneInput,
  normalizeBrPhone,
  parseMoneyToCents,
  weekdayOf,
  whatsappLink,
} from "./format";

describe("format", () => {
  it("usa o fuso de São Paulo", () => {
    // 02:30 UTC = 23:30 do dia anterior em SP
    expect(localDate("2026-10-29T02:30:00.000Z")).toBe("2026-10-28");
    expect(formatTime("2026-10-29T02:30:00.000Z")).toBe("23:30");
  });
  it("soma dias atravessando o mês", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(weekdayOf("2026-10-28")).toBe(3);
  });
  it("formata dinheiro e duração", () => {
    expect(formatMoney(4500)).toBe("R$ 45,00");
    expect(parseMoneyToCents("R$ 1.234,50")).toBe(123450);
    expect(formatDuration(90)).toBe("1h30");
    expect(formatDuration(45)).toBe("45 min");
  });
  it("normaliza telefone igual ao backend", () => {
    expect(normalizeBrPhone("(62) 99999-0000")).toBe("+5562999990000");
    expect(normalizeBrPhone("+5562999990000")).toBe("+5562999990000");
    expect(normalizeBrPhone("(62) 3241-5500")).toBeNull();
    expect(maskPhoneInput("62999990000")).toBe("(62) 99999-0000");
    expect(formatPhone("+5562999990000")).toBe("(62) 99999-0000");
    expect(whatsappLink("+5562999990000", "oi")).toBe("https://wa.me/5562999990000?text=oi");
  });
});
