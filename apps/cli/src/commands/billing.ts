import { Effect } from "effect";
import {
  assignOrganizationPlanRequestSchema,
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
} from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { apiCall, type ClientConfig } from "../lib/futrob-client.ts";
import { ApiError, UsageError, type CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- plans
  npm run cli -- org-plan <orgId> --actor <id>
  npm run cli -- org-entitlements <orgId> --actor <id>
  npm run cli -- org-plan-assign <orgId> <free|pro|league> --reason "<motivo>" --actor <superuser>
      [--status active|trialing|past_due|canceled] [--trial-ends <ISO>]
  npm run cli -- billing-smoke --actor <organizer> --superuser <superuser>`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

const limit = (value: number | null) => (value === null ? "∞" : String(value));

export function plans(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const catalog = yield* apiCall(configOf(common), (client) => client.billing.listPublicPlans());
    if (common.json) {
      printJson(catalog);
      return 0;
    }
    for (const plan of catalog.plans) {
      const { limits, quotas, features } = plan.entitlements;
      print(
        `${plan.key} v${plan.version}\tcompeticiones=${limit(limits.activeCompetitions)}\tequipos=${limit(limits.teamsPerCompetition)}\tstaff=${limit(limits.staffMembers)}\tsync/mes=${limit(quotas.provider_sync_jobs.amount)}\tranking=${features.performanceRanking}`,
      );
    }
    return 0;
  });
}

export function orgPlan(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const plan = yield* apiCall(configOf(common), (client) =>
      client.billing.getOrganizationPlan(organizationId),
    );
    if (common.json) {
      printJson(plan);
      return 0;
    }
    const sync = plan.quotas[0];
    print(
      `Plan ${plan.plan.key} (${plan.source}) estado=${plan.subscription?.state.status ?? "—"}`,
    );
    print(
      `competiciones activas ${plan.usage.activeCompetitions}/${limit(plan.plan.entitlements.limits.activeCompetitions)}  staff ${plan.usage.staffMembers}/${limit(plan.plan.entitlements.limits.staffMembers)}`,
    );
    if (sync)
      print(
        `sync ${sync.periodKey}: ${sync.used}/${limit(sync.limit)} (reinicia ${sync.resetsAt})`,
      );
    return 0;
  });
}

export function orgEntitlements(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.billing.getOrganizationEntitlements(organizationId),
    );
    printJson(result);
    return 0;
  });
}

export function orgPlanAssign(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, planKey] = yield* requirePositionals(common.positionals, 2, USAGE);
    const status = flagString(common.flags, "status") ?? "active";
    const parsed = assignOrganizationPlanRequestSchema.safeParse({
      planKey,
      state:
        status === "trialing"
          ? { status, trialEndsAt: flagString(common.flags, "trial-ends") }
          : { status },
      reason: flagString(common.flags, "reason") ?? "",
    });
    if (!parsed.success) {
      return yield* Effect.fail(
        new UsageError({
          message: parsed.error.issues[0]?.message ?? "Entrada inválida",
          usage: USAGE,
        }),
      );
    }
    const assigned = yield* apiCall(configOf(common), (client) =>
      client.billing.assignOrganizationPlan(organizationId, parsed.data),
    );
    if (common.json) printJson(assigned);
    else
      print(
        `Plan ${assigned.subscription.planKey} (${assigned.subscription.state.status}) asignado`,
      );
    return 0;
  });
}

/** Runs one call and returns its API failure; success is the unexpected outcome. */
function expectApiFailure<A>(
  effect: Effect.Effect<A, CliError>,
): Effect.Effect<ApiError, CliError> {
  return Effect.matchEffect(effect, {
    onSuccess: () =>
      Effect.fail(new UsageError({ message: "La llamada debía fallar y tuvo éxito" })),
    onFailure: (error) => (error instanceof ApiError ? Effect.succeed(error) : Effect.fail(error)),
  });
}

const failureSummary = (error: ApiError) =>
  JSON.stringify({ status: error.status, code: error.code, details: error.details });

/**
 * Live smoke (ADR-0025): a new organization on Gratis exhausts its sync quota, sees that a
 * duplicate job does not consume, is refused a second active competition, and after a
 * superuser assigns Pro the same steps succeed. Sync jobs only queue; nothing calls EA.
 */
export function billingSmoke(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const organizer = configOf(common);
    const superuserId = flagString(common.flags, "superuser");
    if (!common.actorId || !superuserId) {
      return yield* Effect.fail(
        new UsageError({ message: "Faltan --actor y --superuser", usage: USAGE }),
      );
    }
    const superuser: ClientConfig = { baseUrl: common.baseUrl, actorId: superuserId };
    const evidence: { label: string; ok: boolean; detail: string }[] = [];
    const check = (label: string, ok: boolean, detail: string) => {
      evidence.push({ label, ok, detail });
      print(`${ok ? "✓" : "✗"} ${label}  ${detail}`);
      return ok;
    };
    let passed = true;
    const suffix = Date.now();

    const org = yield* apiCall(organizer, (client) =>
      client.organizations.create({ name: `Billing Smoke ${suffix}`, timeZone: "UTC" }),
    );
    const organizationId = org.organizationId;
    print(`organización ${organizationId}`);
    const draft = (name: string) =>
      apiCall(organizer, (client) =>
        client.competitions.createDraft(organizationId, {
          name,
          gameEdition: "fc27",
          platform: competitionPlatformSchema.parse("playstation"),
          region: competitionRegionSchema.parse("america"),
          timeZone: "UTC",
          format: competitionFormatSchema.parse("league"),
        }),
      );
    const enqueue = (externalClubId: string) =>
      apiCall(organizer, (client) =>
        client.gameData.syncJobs.enqueue({
          organizationId,
          providerKey: "ea-clubs",
          externalClubId,
          platform: "common-gen5",
          gameEdition: "fc27",
          matchType: "friendlyMatch",
          maxResultCount: 10,
        }),
      );
    const usage = () =>
      apiCall(organizer, (client) => client.billing.getOrganizationPlan(organizationId));

    const initial = yield* usage();
    passed &&= check(
      "starts on free",
      initial.plan.key === "free" && initial.source === "fallback",
      JSON.stringify({ plan: initial.plan.key, quota: initial.quotas[0] }),
    );
    const freeLimit = initial.quotas[0]?.limit ?? 0;

    yield* draft(`Liga 1 ${suffix}`);
    const secondFree = yield* expectApiFailure(draft(`Liga 2 ${suffix}`));
    passed &&= check(
      "free: second active competition refused",
      secondFree.status === 402 && secondFree.code === "competitions.plan_limit_reached",
      failureSummary(secondFree),
    );

    const firstJob = yield* enqueue("smoke-club-0");
    for (let index = 1; index < freeLimit; index++) yield* enqueue(`smoke-club-${index}`);
    const exhausted = yield* expectApiFailure(enqueue(`smoke-club-${freeLimit}`));
    passed &&= check(
      "free: job past the quota refused",
      exhausted.status === 402 && exhausted.code === "game_data.sync_quota_exhausted",
      failureSummary(exhausted),
    );
    const duplicate = yield* enqueue("smoke-club-0");
    const afterDuplicate = yield* usage();
    passed &&= check(
      "free: deduplicated job returns the active one without consuming",
      duplicate.id === firstJob.id && afterDuplicate.quotas[0]?.used === freeLimit,
      JSON.stringify({
        firstJobId: firstJob.id,
        duplicateId: duplicate.id,
        quota: afterDuplicate.quotas[0],
      }),
    );

    const assigned = yield* apiCall(superuser, (client) =>
      client.billing.assignOrganizationPlan(organizationId, {
        planKey: "pro",
        state: { status: "active" },
        reason: "billing-smoke",
      }),
    );
    passed &&= check(
      "superuser assigns pro",
      assigned.subscription.planKey === "pro",
      JSON.stringify(assigned.subscription),
    );

    const secondPro = yield* draft(`Liga 2 ${suffix}`);
    passed &&= check(
      "pro: second active competition created",
      Boolean(secondPro.competition.id),
      JSON.stringify({ competitionId: secondPro.competition.id }),
    );
    const nextJob = yield* enqueue(`smoke-club-${freeLimit}`);
    const proDuplicate = yield* enqueue(`smoke-club-${freeLimit}`);
    const afterPro = yield* usage();
    passed &&= check(
      "pro: job past the free quota accepted and its duplicate not consumed",
      proDuplicate.id === nextJob.id && afterPro.quotas[0]?.used === freeLimit + 1,
      JSON.stringify({
        jobId: nextJob.id,
        duplicateId: proDuplicate.id,
        quota: afterPro.quotas[0],
      }),
    );
    passed &&= check(
      "plan change audited",
      afterPro.recentChanges[0]?.reason === "billing-smoke",
      JSON.stringify(afterPro.recentChanges[0]),
    );

    if (common.json) printJson({ passed, organizationId, evidence });
    return passed ? 0 : 1;
  });
}
