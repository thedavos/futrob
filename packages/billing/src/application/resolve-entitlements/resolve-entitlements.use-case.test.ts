import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { SubscriptionState } from "../../domain/entities/subscription.ts";
import { createBillingHarness, ORG } from "../billing.test-support.ts";
import {
  CheckOrganizationFeatureUseCase,
  ResolveActorEntitlementsUseCase,
} from "./resolve-entitlements.use-case.ts";

function subscribe(harness: ReturnType<typeof createBillingHarness>, state: SubscriptionState) {
  return harness.subscriptions.save({
    id: "sub-1",
    subject: { type: "organization", organizationId: ORG },
    planKey: "pro",
    state,
    createdAt: harness.clock.now(),
    updatedAt: harness.clock.now(),
  });
}

describe("ResolveOrganizationEntitlementsUseCase", () => {
  it("falls back to free without a subscription", async () => {
    const harness = createBillingHarness();

    const resolved = await harness.resolve.execute(ORG);

    expect(resolved).toMatchObject({
      source: "fallback",
      plan: { key: "free" },
      subscription: null,
    });
    expect(resolved.plan.entitlements.limits.activeCompetitions).toBe(1);
  });

  it.each<[string, SubscriptionState, "pro" | "free"]>([
    ["active", { status: "active" }, "pro"],
    ["past due", { status: "past_due", pastDueSince: new Date("2026-10-01") }, "pro"],
    ["running trial", { status: "trialing", trialEndsAt: new Date("2026-10-20") }, "pro"],
    ["expired trial", { status: "trialing", trialEndsAt: new Date("2026-10-10") }, "free"],
    ["canceled", { status: "canceled", canceledAt: new Date("2026-10-01") }, "free"],
  ])("resolves a %s subscription to %s", async (_label, state, expected) => {
    const harness = createBillingHarness();
    await subscribe(harness, state);

    expect((await harness.resolve.execute(ORG)).plan.key).toBe(expected);
  });
});

describe("CheckOrganizationFeatureUseCase", () => {
  it("denies the performance ranking on free and allows it on Pro", async () => {
    const harness = createBillingHarness();
    const check = new CheckOrganizationFeatureUseCase(harness.resolve);

    const denied = await check.execute({ organizationId: ORG, feature: "performanceRanking" });
    expect(!denied.isOk() && denied.error).toMatchObject({
      code: "billing.feature_not_in_plan",
      feature: "performanceRanking",
      planKey: "free",
    });

    await subscribe(harness, { status: "active" });
    expect(
      (await check.execute({ organizationId: ORG, feature: "performanceRanking" })).isOk(),
    ).toBe(true);
  });
});

describe("ResolveActorEntitlementsUseCase", () => {
  it("grants player premium only to the subscribed actor", async () => {
    const harness = createBillingHarness();
    const resolveActor = new ResolveActorEntitlementsUseCase(harness);
    const player = asActorId("player-1");
    await harness.subscriptions.save({
      id: "sub-actor",
      subject: { type: "actor", actorId: player },
      planKey: "player_premium",
      state: { status: "active" },
      createdAt: harness.clock.now(),
      updatedAt: harness.clock.now(),
    });

    expect(await resolveActor.execute(player)).toEqual({ playerPremiumInsights: true });
    expect(await resolveActor.execute(asActorId("player-2"))).toEqual({
      playerPremiumInsights: false,
    });
    expect((await harness.resolve.execute(ORG)).plan.key).toBe("free");
  });
});
