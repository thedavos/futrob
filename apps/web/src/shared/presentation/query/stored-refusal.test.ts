import { describe, expect, it } from "vite-plus/test";
import { readKeepingRefusal, refusalLabel } from "./stored-refusal.ts";

describe("readKeepingRefusal", () => {
  it("returns the read value", async () => {
    await expect(
      readKeepingRefusal(
        async () => "standings",
        () => undefined,
      ),
    ).resolves.toEqual({
      outcome: "value",
      value: "standings",
    });
  });

  it("stores 401, 403, and 404 and rethrows every other failure", async () => {
    const refused = await readKeepingRefusal(
      async () => {
        throw Object.assign(new Error("denied"), { status: 403 });
      },
      (error) => ("status" in error ? Number(error.status) : undefined),
    );
    expect(refused).toEqual({ outcome: "refused", status: 403 });

    await expect(
      readKeepingRefusal(
        async () => {
          throw Object.assign(new Error("down"), { status: 500 });
        },
        (error) => ("status" in error ? Number(error.status) : undefined),
      ),
    ).rejects.toThrow("down");
  });

  it("labels a missing resource apart from a denied read", () => {
    expect(refusalLabel(404)).toBe("not_found");
    expect(refusalLabel(401)).toBe("forbidden");
    expect(refusalLabel(403)).toBe("forbidden");
  });
});
