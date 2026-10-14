import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { undocumentedHonoRoutes } from "@/http/contract/route-coverage.ts";

describe("OpenAPI contract verifiers", () => {
  it("fails when a documented 200 body omits a required field", async () => {
    const res = new Response(JSON.stringify({ ok: true, service: "futrob" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    await expect(expectMatchesOpenApi(res, "get", "/meta/ping")).rejects.toThrow(
      /body does not match/,
    );
  });

  it("fails when the status is not documented for the operation", async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 418,
      headers: { "Content-Type": "application/json" },
    });
    await expect(expectMatchesOpenApi(res, "get", "/meta/ping")).rejects.toThrow(
      /does not document status 418/,
    );
  });

  it("fails coverage when a Hono route is absent from the spec", () => {
    const app = new Hono();
    app.get("/api/v1/undocumented-probe", (c) => c.json({ ok: true }));
    expect(undocumentedHonoRoutes(app)).toEqual([{ method: "get", path: "/undocumented-probe" }]);
  });
});
