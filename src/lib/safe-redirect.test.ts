import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("mantém caminhos internos", () => {
    expect(safeRedirect("/appointments?scope=history")).toBe("/appointments?scope=history");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil", "", null, "/\u0000x"])(
    "bloqueia %s",
    (value) => {
      expect(safeRedirect(value as string, "/x")).toBe("/x");
    },
  );
});
