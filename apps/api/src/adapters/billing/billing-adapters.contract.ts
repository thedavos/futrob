import type {
  PlanChangeAuditRepository,
  QuotaLedgerPort,
  SubscriptionRepository,
} from "@futrob/billing";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { expect, it } from "vite-plus/test";

export const CONTRACT_ORG = asOrganizationId("billing-org-a");
export const CONTRACT_OTHER_ORG = asOrganizationId("billing-org-b");
export const CONTRACT_SUPERUSER = asActorId("billing-superuser");

export interface BillingAdapters {
  readonly ledger: QuotaLedgerPort;
  readonly subscriptions: SubscriptionRepository;
  readonly audit: PlanChangeAuditRepository;
}

const at = new Date("2026-10-15T12:00:00.000Z");

function request(
  usageKey: string,
  overrides: {
    organizationId?: typeof CONTRACT_ORG;
    limit?: number | null;
    periodKey?: string;
  } = {},
) {
  return {
    organizationId: overrides.organizationId ?? CONTRACT_ORG,
    quota: "provider_sync_jobs" as const,
    usageKey,
    periodKey: overrides.periodKey ?? "2026-10",
    limit: overrides.limit === undefined ? 3 : overrides.limit,
    consumedAt: at,
  };
}

/** Behavior every billing adapter pair must share. */
export function billingAdapterContract(create: () => Promise<BillingAdapters>) {
  it("consumes up to the limit, replays recorded keys and scopes by organization and period", async () => {
    const { ledger } = await create();

    expect(await ledger.consume(request("job-1"))).toEqual({ outcome: "consumed", used: 1 });
    expect(await ledger.consume(request("job-2"))).toEqual({ outcome: "consumed", used: 2 });
    expect(await ledger.consume(request("job-1"))).toEqual({ outcome: "replayed", used: 2 });
    expect(await ledger.consume(request("job-3"))).toEqual({ outcome: "consumed", used: 3 });
    expect(await ledger.consume(request("job-4"))).toEqual({ outcome: "exhausted", used: 3 });
    expect(await ledger.consume(request("job-2"))).toEqual({ outcome: "replayed", used: 3 });
    expect(await ledger.consume(request("job-4", { organizationId: CONTRACT_OTHER_ORG }))).toEqual({
      outcome: "consumed",
      used: 1,
    });
    expect(await ledger.consume(request("job-5", { periodKey: "2026-11" }))).toEqual({
      outcome: "consumed",
      used: 1,
    });
    expect(
      await ledger.used({
        organizationId: CONTRACT_ORG,
        quota: "provider_sync_jobs",
        periodKey: "2026-10",
      }),
    ).toBe(3);

    await ledger.release({
      organizationId: CONTRACT_ORG,
      quota: "provider_sync_jobs",
      usageKey: "job-3",
    });
    expect(await ledger.consume(request("job-4"))).toEqual({ outcome: "consumed", used: 3 });
  });

  it("never exceeds the limit under concurrent consumption", async () => {
    const { ledger } = await create();

    const outcomes = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        ledger.consume(request(`burst-${index}`, { limit: 5 })),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.outcome === "consumed")).toHaveLength(5);
    expect(
      await ledger.used({
        organizationId: CONTRACT_ORG,
        quota: "provider_sync_jobs",
        periodKey: "2026-10",
      }),
    ).toBe(5);
  });

  it("keeps one subscription per organization and audits changes newest first", async () => {
    const { subscriptions, audit } = await create();
    const subject = { type: "organization" as const, organizationId: CONTRACT_ORG };

    await subscriptions.save({
      id: "sub-1",
      subject,
      planKey: "pro",
      state: { status: "trialing", trialEndsAt: new Date("2026-11-01T00:00:00.000Z") },
      createdAt: at,
      updatedAt: at,
    });
    await subscriptions.save({
      id: "sub-1",
      subject,
      planKey: "league",
      state: { status: "past_due", pastDueSince: at },
      createdAt: at,
      updatedAt: new Date("2026-10-16T00:00:00.000Z"),
    });
    await audit.append({
      id: "change-1",
      subject,
      changedByActorId: CONTRACT_SUPERUSER,
      before: null,
      after: { planKey: "pro", state: { status: "active" } },
      reason: "Alta",
      occurredAt: at,
    });
    await audit.append({
      id: "change-2",
      subject,
      changedByActorId: CONTRACT_SUPERUSER,
      before: { planKey: "pro", state: { status: "active" } },
      after: { planKey: "league", state: { status: "past_due", pastDueSince: at } },
      reason: "Upgrade",
      occurredAt: new Date("2026-10-16T00:00:00.000Z"),
    });

    expect(await subscriptions.findForOrganization(CONTRACT_ORG)).toEqual({
      id: "sub-1",
      subject,
      planKey: "league",
      state: { status: "past_due", pastDueSince: at },
      createdAt: at,
      updatedAt: new Date("2026-10-16T00:00:00.000Z"),
    });
    expect(await subscriptions.findForOrganization(CONTRACT_OTHER_ORG)).toBeNull();
    const changes = await audit.listForOrganization(CONTRACT_ORG, 10);
    expect(changes.map((change) => change.id)).toEqual(["change-2", "change-1"]);
    expect(changes[0]?.after).toEqual({
      planKey: "league",
      state: { status: "past_due", pastDueSince: at },
    });
    expect(await audit.listForOrganization(CONTRACT_OTHER_ORG, 10)).toEqual([]);
  });

  it("stores the actor add-on apart from any organization", async () => {
    const { subscriptions } = await create();
    const actorId = CONTRACT_SUPERUSER;

    await subscriptions.save({
      id: "sub-actor",
      subject: { type: "actor", actorId },
      planKey: "player_premium",
      state: { status: "active" },
      createdAt: at,
      updatedAt: at,
    });

    expect((await subscriptions.findForActor(actorId))?.planKey).toBe("player_premium");
    expect(await subscriptions.findForOrganization(CONTRACT_ORG)).toBeNull();
  });
}
