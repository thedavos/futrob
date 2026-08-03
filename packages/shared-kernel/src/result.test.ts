import { describe, expect, it } from "vite-plus/test";
import { err, isError, isOk, ok } from "./result.ts";

describe("Result", () => {
  it("wraps ok values", () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    expect(result.status).toBe("ok");
    expect(result.value).toBe(42);
  });

  it("wraps errors", () => {
    const result = err("boom");
    expect(isError(result)).toBe(true);
    expect(result.status).toBe("error");
    expect(result.error).toBe("boom");
  });
});
