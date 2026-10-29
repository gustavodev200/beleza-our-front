import { describe, expect, it } from "vitest";
import { bookingDays, buildTimeCells } from "./slots";

const hours = { weekday: 3, opensAt: 9 * 60, closesAt: 11 * 60, breakStart: 10 * 60, breakEnd: 10 * 60 + 30 };

describe("buildTimeCells", () => {
  it("marca livres e ocupados, pula a pausa e respeita a duração", () => {
    const free = [{ startsAt: "2026-11-04T12:00:00.000Z", professionalIds: ["p1"] }]; // 09:00 SP
    const cells = buildTimeCells("2026-11-04", hours, 30, free, new Date("2026-11-01T12:00:00Z"));
    expect(cells.map((c) => c.time)).toEqual(["09:00", "09:15", "09:30", "10:30"]);
    expect(cells[0].slot).not.toBeNull();
    expect(cells[1].slot).toBeNull();
  });
  it("esconde horários passados de hoje", () => {
    const cells = buildTimeCells("2026-11-04", hours, 30, [], new Date("2026-11-04T12:20:00Z")); // 09:20 SP
    expect(cells.map((c) => c.time)).toEqual(["09:30", "10:30"]);
  });
  it("dia fechado não tem grade", () => {
    expect(buildTimeCells("2026-11-04", undefined, 30, [])).toEqual([]);
  });
});

describe("bookingDays", () => {
  it("7 dias com fechados marcados", () => {
    const days = bookingDays([hours], "2026-11-04");
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: "2026-11-04", closed: false });
    expect(days[1].closed).toBe(true);
  });
});
