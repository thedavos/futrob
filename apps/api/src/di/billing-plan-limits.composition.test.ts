import { asActorId, type OrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { AppModules } from "./app-modules.ts";
import { createModules } from "./create-modules.ts";

const ORGANIZER = asActorId("billing-organizer");
const SUPERUSER = asActorId("billing-superuser");

function sync(organizationId: OrganizationId, externalClubId: string) {
  return {
    organizationId,
    providerKey: "ea-clubs" as const,
    requestId: `request-${externalClubId}`,
    sync: {
      externalClubId,
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    },
  };
}

function competition(organizationId: OrganizationId, creationKey: string) {
  return {
    organizationId,
    actorId: ORGANIZER,
    name: `Liga ${creationKey}`,
    gameEdition: "FC 26",
    platform: "playstation" as const,
    region: "south-america" as const,
    timeZone: "America/Lima",
    format: "league" as const,
    creationKey,
  };
}

async function setup() {
  const modules = createModules({
    fetcher: async () => new Response("[]", { status: 200 }),
    eaClubsBaseUrl: "https://ea.example.test/api/fc",
    pool: undefined,
  });
  const created = await modules.organizations.createOrganization.execute({
    name: "Liga Gratis",
    actorId: ORGANIZER,
    timeZone: "America/Lima",
  });
  if (!created.isOk()) throw created.error;
  await modules.organizations.repositories.platformRoles.assignSuperuser({
    actorId: SUPERUSER,
    role: "superuser",
    assignedByActorId: SUPERUSER,
    createdAt: new Date(),
  });
  return { modules, organizationId: created.value.organization.id };
}

async function usedSyncQuota(modules: AppModules, organizationId: OrganizationId) {
  const plan = await modules.billing.useCases.getOrganizationPlan.execute({
    actorId: ORGANIZER,
    organizationId,
  });
  if (!plan.isOk()) throw plan.error;
  return plan.value.quotas[0];
}

describe("billing plan limits composition", () => {
  it("enforces the free plan and lifts it after a superuser assigns Pro", async () => {
    const { modules, organizationId } = await setup();
    const enqueue = modules.gameData.enqueueProviderSyncJob;

    expect(
      (await modules.competitions.createDraft.execute(competition(organizationId, "a"))).isOk(),
    ).toBe(true);
    const second = await modules.competitions.createDraft.execute(competition(organizationId, "b"));
    expect(!second.isOk() && second.error.code).toBe("competitions.plan_limit_reached");

    const first = await enqueue.execute(sync(organizationId, "club-0"));
    for (let index = 1; index < 60; index++) {
      expect((await enqueue.execute(sync(organizationId, `club-${index}`))).isOk()).toBe(true);
    }
    const exhausted = await enqueue.execute(sync(organizationId, "club-60"));
    const duplicate = await enqueue.execute(sync(organizationId, "club-0"));

    expect(!exhausted.isOk() && exhausted.error).toMatchObject({
      code: "game_data.sync_quota_exhausted",
      limit: 60,
      used: 60,
    });
    expect(duplicate.isOk() && first.isOk() && duplicate.value.id === first.value.id).toBe(true);
    expect(await usedSyncQuota(modules, organizationId)).toMatchObject({ used: 60, limit: 60 });

    const byOrganizer = await modules.billing.useCases.assignOrganizationPlan.execute({
      actorId: ORGANIZER,
      organizationId,
      planKey: "pro",
      state: { status: "active" },
      reason: "Self upgrade",
    });
    expect(!byOrganizer.isOk() && byOrganizer.error.code).toBe("billing.forbidden");
    const assigned = await modules.billing.useCases.assignOrganizationPlan.execute({
      actorId: SUPERUSER,
      organizationId,
      planKey: "pro",
      state: { status: "active" },
      reason: "Acuerdo comercial",
    });
    expect(assigned.isOk()).toBe(true);

    expect(
      (await modules.competitions.createDraft.execute(competition(organizationId, "b"))).isOk(),
    ).toBe(true);
    expect((await enqueue.execute(sync(organizationId, "club-60"))).isOk()).toBe(true);
    expect((await enqueue.execute(sync(organizationId, "club-0"))).isOk()).toBe(true);
    expect(await usedSyncQuota(modules, organizationId)).toMatchObject({ used: 61, limit: 600 });
  });

  it("keeps billing.plans.assign out of the organizer bundle", async () => {
    const { modules, organizationId } = await setup();

    const access = await modules.authorization.port.getEffectiveAccess({
      actorId: ORGANIZER,
      scope: { organizationId },
      permissions: ["billing.read", "billing.entitlements.read", "billing.plans.assign"],
    });

    const allowed = Object.fromEntries(
      access.permissions.map(({ permission, allowed }) => [permission, allowed]),
    );
    expect(allowed).toEqual({
      "billing.read": true,
      "billing.entitlements.read": true,
      "billing.plans.assign": false,
    });
  });
});
