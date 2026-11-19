import { describe, expect, it } from "vitest";

import { resolveNav } from "./navigation";

describe("resolveNav", () => {
  it("resolves the pharmacy dashboard landing route", () => {
    const resolved = resolveNav("/pharmacy");

    expect(resolved?.group.id).toBe("pharmacy");
    expect(resolved?.item.href).toBe("/pharmacy");
    expect(resolved?.item.label).toBe("Pharmacy Dashboard");
  });
});
