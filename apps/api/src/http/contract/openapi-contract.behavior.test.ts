import { describe, expect, it } from "vite-plus/test";
import { Hono } from "hono";
import { z } from "zod";
import { apiErrorSchema } from "@futrob/api-contracts";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { undocumentedHonoRoutes } from "@/http/contract/route-coverage.ts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

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

  it("exposes .openapi() on Zod 4.6 schemas after the prototype patch", () => {
    expect(() => namedSchema("ApiErrorZod46Probe", apiErrorSchema)).not.toThrow();
    expect(() => namedSchema("Zod46ObjectProbe", z.object({ ok: z.boolean() }))).not.toThrow();
  });
});
