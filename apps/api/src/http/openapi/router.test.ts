import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { defineRoute } from "@/http/openapi/define-route.ts";
import { createOpenApiRouter } from "@/http/openapi/router.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const echoBody = z.object({ name: z.string().min(1) });
const echoResponse = z.object({ name: z.string() });

const echoRoute = defineRoute({
  method: "post",
  path: "/probe",
  operationId: "probeOpenApiValidation",
  tags: ["meta"],
  summary: "Isolated OpenAPIHono validation probe",
  public: true,
  body: echoBody,
  success: { status: 200, description: "Echo", schema: echoResponse },
  errors: [400],
});

describe("createOpenApiRouter defaultHook", () => {
  it("returns the ApiError validation envelope for a Zod-invalid body", async () => {
    const app = createOpenApiRouter();
    app.openapi(echoRoute, (c) => jsonResponse(c.req.valid("json")));

    const response = await app.request("/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
      details: { issues: expect.any(Array) },
    });
  });

  it("passes a valid body through to the handler", async () => {
    const app = createOpenApiRouter();
    app.openapi(echoRoute, (c) => jsonResponse(c.req.valid("json")));

    const response = await app.request("/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "liga" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "liga" });
  });
});
