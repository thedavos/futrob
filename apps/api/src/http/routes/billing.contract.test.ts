import {
  createOrganizationResponseSchema,
  listPublicPlansResponseSchema,
} from "@futrob/api-contracts";
import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import {
  buildAppWithModules,
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

const ORGANIZER = "actor-billing-organizer";
const SUPERUSER = "actor-billing-superuser";
const OUTSIDER = "actor-billing-outsider";

async function setup() {
  const { app, modules } = buildAppWithModules(stubFetch);
  await modules.organizations.repositories.platformRoles.assignSuperuser({
    actorId: asActorId(SUPERUSER),
    role: "superuser",
    assignedByActorId: asActorId(SUPERUSER),
    createdAt: new Date(),
  });
  const created = await app.request("/api/v1/organizations", {
    method: "POST",
    headers: serviceHeaders(ORGANIZER),
    body: JSON.stringify({ name: "Liga Billing", timeZone: "UTC" }),
  });
  const { organizationId } = await parseResponse(createOrganizationResponseSchema, created);
  const planPath = `/api/v1/organizations/${organizationId}/billing/plan`;
  return { app, organizationId, planPath };
}

describe("billing HTTP contract", () => {
  it("publishes the catalog anonymously", async () => {
    const { app } = await setup();

    const response = await app.request("/api/v1/public/plans");

    expect(response.status).toBe(200);
    const body = listPublicPlansResponseSchema.parse(await response.clone().json());
    expect(body.plans.map((plan) => plan.key)).toEqual(["free", "pro", "league"]);
    await expectMatchesOpenApi(response, "get", "/public/plans");
  });

  it("reads the free plan, refuses organizer and outsider writes and audits a superuser assignment", async () => {
    const { app, organizationId, planPath } = await setup();

    const free = await app.request(planPath, { headers: serviceHeaders(ORGANIZER) });
    expect(free.status).toBe(200);
    expect(await free.clone().json()).toMatchObject({
      plan: { key: "free" },
      source: "fallback",
      subscription: null,
      quotas: [{ quota: "provider_sync_jobs", used: 0, limit: 60 }],
      usage: { activeCompetitions: 0, staffMembers: 1 },
    });
    await expectMatchesOpenApi(free, "get", "/organizations/{organizationId}/billing/plan");
    expect((await app.request(planPath, { headers: serviceHeaders(OUTSIDER) })).status).toBe(403);

    const assign = (actorId: string, body: unknown) =>
      app.request(planPath, {
        method: "PUT",
        headers: serviceHeaders(actorId),
        body: JSON.stringify(body),
      });
    const pro = { planKey: "pro", state: { status: "active" }, reason: "Acuerdo comercial" };
    const byOrganizer = await assign(ORGANIZER, pro);
    expect(byOrganizer.status).toBe(403);
    expect(await byOrganizer.clone().json()).toMatchObject({ code: "billing.forbidden" });
    await expectMatchesOpenApi(byOrganizer, "put", "/organizations/{organizationId}/billing/plan");
    expect((await assign(SUPERUSER, { ...pro, planKey: "gold" })).status).toBe(400);

    const assigned = await assign(SUPERUSER, pro);
    expect(assigned.status).toBe(200);
    await expectMatchesOpenApi(assigned, "put", "/organizations/{organizationId}/billing/plan");

    const after = await (
      await app.request(planPath, { headers: serviceHeaders(ORGANIZER) })
    ).json();
    expect(after).toMatchObject({
      organizationId,
      plan: { key: "pro" },
      source: "subscription",
      subscription: { planKey: "pro", state: { status: "active" } },
      recentChanges: [
        {
          changedByActorId: SUPERUSER,
          before: null,
          after: { planKey: "pro" },
          reason: "Acuerdo comercial",
        },
      ],
    });
    const entitlements = await app.request(
      `/api/v1/organizations/${organizationId}/billing/entitlements`,
      { headers: serviceHeaders(ORGANIZER) },
    );
    expect(await entitlements.clone().json()).toMatchObject({
      planKey: "pro",
      entitlements: { features: { performanceRanking: true } },
    });
    await expectMatchesOpenApi(
      entitlements,
      "get",
      "/organizations/{organizationId}/billing/entitlements",
    );
  });

  it("answers 402 for a second active competition and for a sync past the monthly quota", async () => {
    const { app, organizationId } = await setup();
    const createCompetition = (name: string) =>
      app.request(`/api/v1/organizations/${organizationId}/competitions`, {
        method: "POST",
        headers: serviceHeaders(ORGANIZER),
        body: JSON.stringify({ ...onboardingCompetition, name }),
      });
    expect((await createCompetition("Liga 1")).status).toBe(201);

    const second = await createCompetition("Liga 2");
    expect(second.status).toBe(402);
    expect(await second.clone().json()).toMatchObject({
      code: "competitions.plan_limit_reached",
      details: { planLimit: "active_competitions", max: 1 },
    });
    await expectMatchesOpenApi(second, "post", "/organizations/{organizationId}/competitions");

    const enqueue = (externalClubId: string) =>
      app.request("/api/v1/internal/game-data/sync-jobs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          providerKey: "ea-clubs",
          externalClubId,
          platform: "common-gen5",
          gameEdition: "fc26",
          matchType: "friendlyMatch",
          maxResultCount: 10,
        }),
      });
    for (let index = 0; index < 60; index++) {
      expect((await enqueue(`club-${index}`)).status).toBe(202);
    }
    const exhausted = await enqueue("club-60");
    expect(exhausted.status).toBe(402);
    expect(await exhausted.clone().json()).toMatchObject({
      code: "game_data.sync_quota_exhausted",
      details: { planLimit: "provider_sync_jobs", max: 60, used: 60 },
    });
    await expectMatchesOpenApi(exhausted, "post", "/internal/game-data/sync-jobs");
    expect((await enqueue("club-0")).status).toBe(202);
  });
});
