import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

const PATH = "/api/v1/identity/preferences";

function save(app: ReturnType<typeof buildApp>, actor: string, body: unknown) {
  return app.request(PATH, {
    method: "PUT",
    headers: serviceHeaders(actor),
    body: JSON.stringify(body),
  });
}

describe("apps/api http actor preferences", () => {
  it("requires an authenticated actor", async () => {
    const res = await buildApp(stubFetch).request(PATH);

    expect(res.status).toBe(401);
  });

  it("defaults to navigation and keeps each account's saved layout", async () => {
    const app = buildApp(stubFetch);

    const initial = await app.request(PATH, { headers: serviceHeaders("actor-a") });
    expect(initial.status).toBe(200);
    expect(await initial.json()).toEqual({ sidebarLayout: "navigation" });

    const saved = await save(app, "actor-a", { sidebarLayout: "pending-queue" });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ sidebarLayout: "pending-queue" });

    const mine = await app.request(PATH, { headers: serviceHeaders("actor-a") });
    expect(await mine.json()).toEqual({ sidebarLayout: "pending-queue" });
    const other = await app.request(PATH, { headers: serviceHeaders("actor-b") });
    expect(await other.json()).toEqual({ sidebarLayout: "navigation" });
  });

  it("rejects an unknown layout", async () => {
    const res = await save(buildApp(stubFetch), "actor-a", { sidebarLayout: "floating" });

    expect(res.status).toBe(400);
  });
});
