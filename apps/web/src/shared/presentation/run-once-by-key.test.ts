import { describe, expect, it, vi } from "vite-plus/test";
import { createRunOnceByKey } from "./run-once-by-key.ts";

describe("createRunOnceByKey", () => {
  it("shares one in-flight promise across concurrent callers", async () => {
    const once = createRunOnceByKey<string>();
    let resolveFirst: ((value: string) => void) | undefined;
    const execute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const first = once.run("token-a", execute);
    const second = once.run("token-a", execute);
    resolveFirst?.("ok");

    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not rerun a settled success or failure until forget", async () => {
    const once = createRunOnceByKey<string>();
    const execute = vi.fn(async () => "accepted");
    await expect(once.run("token-a", execute)).resolves.toBe("accepted");
    await expect(once.run("token-a", execute)).resolves.toBe("accepted");
    expect(execute).toHaveBeenCalledTimes(1);

    const failing = createRunOnceByKey<string>();
    const boom = vi.fn(async () => {
      throw new Error("rate-limited");
    });
    await expect(failing.run("token-b", boom)).rejects.toThrow("rate-limited");
    await expect(failing.run("token-b", boom)).rejects.toThrow("rate-limited");
    expect(boom).toHaveBeenCalledTimes(1);

    failing.forget("token-b");
    await expect(failing.run("token-b", boom)).rejects.toThrow("rate-limited");
    expect(boom).toHaveBeenCalledTimes(2);
  });

  it("keeps separate keys independent", async () => {
    const once = createRunOnceByKey<string>();
    const execute = vi.fn(async (value: string) => value);
    await Promise.all([
      once.run("one", () => execute("one")),
      once.run("two", () => execute("two")),
    ]);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
