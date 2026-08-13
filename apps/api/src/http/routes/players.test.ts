import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

describe("apps/api personal statistics routes", () => {
  it("rejects invalid personal statistics query filters", async () => {
    const app = buildApp(stubFetch);

    const response = await app.request("/api/v1/players/me/statistics?position=%20", {
      headers: serviceHeaders("actor-player"),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "api.validation_error" });
  });

  it("returns empty matches instead of forbidding a team filter with no contributions", async () => {
    const app = buildApp(stubFetch);

    const response = await app.request("/api/v1/players/me/matches?teamId=team-without-matches", {
      headers: serviceHeaders("actor-player"),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ matches: [], nextCursor: null });
  });
});
