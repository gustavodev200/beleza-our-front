import { describe, expect, it } from "vitest";
import { layoutLanes } from "./agenda-layout";

describe("layoutLanes", () => {
  it("itens sem sobreposição ocupam a largura toda", () => {
    const out = layoutLanes([
      { id: "a", start: 540, end: 600 },
      { id: "b", start: 600, end: 660 },
    ]);
    expect(out.map((p) => [p.item.id, p.lane, p.lanes])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ]);
  });

  it("sobrepostos ficam lado a lado e reaproveitam faixa livre", () => {
    const out = layoutLanes([
      { id: "a", start: 540, end: 660 },
      { id: "b", start: 570, end: 600 },
      { id: "c", start: 600, end: 630 },
    ]);
    const byId = Object.fromEntries(out.map((p) => [p.item.id, p]));
    expect(byId.a.lane).toBe(0);
    expect(byId.b.lane).toBe(1);
    expect(byId.c.lane).toBe(1);
    expect(out.every((p) => p.lanes === 2)).toBe(true);
  });
});
