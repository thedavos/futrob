import { describe, expect, it } from "vite-plus/test";

import { Panic, assertNever } from "./panic.ts";

describe("Panic", () => {
  it("marks invariant defects without using the expected-error channel", () => {
    const cause = new TypeError("root cause");
    const panic = new Panic("Invariant failed", { cause });

    expect(panic).toBeInstanceOf(Error);
    expect(panic.name).toBe("Panic");
    expect(panic.message).toBe("Invariant failed");
    expect(panic.cause).toBe(cause);
  });
});

describe("assertNever", () => {
  it("throws Panic with the unexpected value", () => {
    // SAFETY: Tests the runtime branch that TypeScript's never type forbids at compile time.
    const unexpected = "oops" as never;
    expect(() => assertNever(unexpected, "Unsupported ranking kind")).toThrow(Panic);
    expect(() => assertNever(unexpected, "Unsupported ranking kind")).toThrow(
      "Unsupported ranking kind: oops",
    );
  });
});
