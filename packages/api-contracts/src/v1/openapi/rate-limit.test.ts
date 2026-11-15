import { describe, expect, it } from "vite-plus/test";
import { apiErrorSchema } from "../errors.ts";

describe("rate-limit contract", () => {
  it("keeps retryAfterSeconds at the top level of an API error", () => {
    expect(
      apiErrorSchema.parse({
        code: "api.rate_limited",
        messageKey: "errors.api.rate_limited",
        requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
        retryAfterSeconds: 42,
      }),
    ).toMatchObject({ retryAfterSeconds: 42 });
  });
});
