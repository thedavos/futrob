import { describe, expect, it } from "vite-plus/test";
import {
  INTERNAL_JOB_SECRET,
  buildApp,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

const REQUEST_ID = "3d4c1e2a-8b70-4f11-9c6a-2b8d1f0e7a55";

function serviceAuthHeaders(actorId = "actor-validation") {
  return {
    Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
    "X-Futrob-Actor-Id": actorId,
    "X-Request-ID": REQUEST_ID,
  };
}

describe("OpenAPIHono runtime validation", () => {
  it("returns 415 api.unsupported_media_type for a non-JSON content type", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: { ...serviceAuthHeaders(), "Content-Type": "text/plain" },
      body: "name=Liga",
    });
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body).toMatchObject({
      code: "api.unsupported_media_type",
      messageKey: "errors.api.unsupported_media_type",
      requestId: REQUEST_ID,
    });
    expect(JSON.stringify(body)).not.toContain("Unsupported Media Type");
  });

  it("returns 415 when a JSON route receives a body without Content-Type", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceAuthHeaders(),
      body: JSON.stringify({ name: "Liga", timeZone: "UTC" }),
    });
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body).toMatchObject({
      code: "api.unsupported_media_type",
      requestId: REQUEST_ID,
    });
  });

  it("maps malformed JSON through onError with requestId and no Hono message", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: { ...serviceAuthHeaders(), "Content-Type": "application/json" },
      body: "{",
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
      requestId: REQUEST_ID,
    });
    expect(JSON.stringify(body)).not.toContain("Malformed JSON in request body");
  });

  it("includes requestId on defaultHook Zod validation failures", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: { ...serviceHeaders("actor-validation"), "X-Request-ID": REQUEST_ID },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
      requestId: REQUEST_ID,
      details: { issues: expect.any(Array) },
    });
  });

  it("rejects an enum path param that previously matched the route as 400", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request(
      "/api/v1/internal/game-data/providers/not-a-provider/health",
      { headers: serviceAuthHeaders() },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
      requestId: REQUEST_ID,
    });
  });

  it("still 404s unconstrained path params for a missing resource", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request("/api/v1/encounters/missing/schedule-snapshot", {
      headers: serviceAuthHeaders(),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "scheduling.encounter_not_found",
      requestId: REQUEST_ID,
    });
  });

  it("keeps the schedule-snapshot per-route hook as api.validation_failed", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request("/api/v1/encounters/encounter-1/schedule-snapshot", {
      method: "PUT",
      headers: { ...serviceHeaders("actor-validation"), "X-Request-ID": REQUEST_ID },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "api.validation_failed",
      messageKey: "errors.api.validation_failed",
      requestId: REQUEST_ID,
    });
  });
});
