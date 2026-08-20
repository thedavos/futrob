import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { buildApp, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

const openApiDocumentSchema = z.object({ openapi: z.string() });

describe("apps/api http meta", () => {
  it("GET /api/v1/meta/ping returns the ping contract", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/meta/ping");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "futrob", apiVersion: "v1" });
  });

  it("responds to CORS preflight from the local web origin", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/game-data/clubs/search", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-Request-ID",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(res.headers.get("access-control-allow-headers")).toContain("X-Request-ID");
    expect(res.headers.get("access-control-expose-headers")).toContain("X-Request-ID");
  });

  it("GET /api/v1/meta/health reports db skipped without DATABASE_URL", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/meta/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, db: "skipped" });
  });

  it("GET /api/v1/openapi.json serves the contract document", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/openapi.json");

    expect(res.status).toBe(200);
    const doc = await parseResponse(openApiDocumentSchema, res);
    expect(doc.openapi).toBe("3.1.0");
  });
});
