import { describe, expect, it } from "vite-plus/test";
import { err, isErr, isOk, ok } from "./result.ts";

describe("Result", () => {
  it("wraps ok values", () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("wraps errors", () => {
    const result = err("boom");
    expect(isErr(result)).toBe(true);
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});
