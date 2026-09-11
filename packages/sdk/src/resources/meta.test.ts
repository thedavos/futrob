import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

describe("createFutrobClient meta", () => {
  it.each(["ok", "skipped", "error"] as const)(
    "health calls /meta/health and reports db %s",
    async (db) => {
      const client = createFutrobClient({
        baseUrl: "https://api.example.com/api/v1",
        fetchImpl: mockFetch((input) => {
          expect(requestUrl(input)).toBe("https://api.example.com/api/v1/meta/health");
          return Response.json({
            ok: db !== "error",
            service: "futrob",
            apiVersion: "v1",
            db,
          });
        }),
      });

      await expect(client.meta.health()).resolves.toMatchObject({ db });
    },
  );
});
