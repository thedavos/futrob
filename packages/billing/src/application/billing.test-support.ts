import {
  asActorId,
  asOrganizationId,
  type ActorId,
  type AuthorizationPort,
  type OrganizationId,
  type Permission,
  Panic,
} from "@futrob/shared-kernel";
import {
  isOrganizationSubscription,
  type ActorSubscription,
  type OrganizationSubscription,
  type PlanChangeAuditEntry,
} from "../domain/entities/subscription.ts";
import {
  DEFAULT_ACTOR_ADD_ONS,
  DEFAULT_ORGANIZATION_PLANS,
} from "../domain/policies/default-plan-catalog.ts";
import type { PlanCatalogPort } from "../domain/ports/plan-catalog.port.ts";
import type { QuotaLedgerPort } from "../domain/ports/quota-ledger.port.ts";
import type {
  PlanChangeAuditRepository,
  SubscriptionRepository,
} from "../domain/ports/subscription.repository.ts";
import { ConsumeOrganizationQuotaUseCase } from "./consume-quota/consume-quota.use-case.ts";
import { ResolveOrganizationEntitlementsUseCase } from "./resolve-entitlements/resolve-entitlements.use-case.ts";

export const ORG = asOrganizationId("org-1");
export const OTHER_ORG = asOrganizationId("org-2");
export const SUPERUSER = asActorId("superuser");
export const ORGANIZER = asActorId("organizer");

export function createBillingHarness(start = new Date("2026-10-15T12:00:00.000Z")) {
  let now = start;
  let counter = 0;
  const organizationSubscriptions = new Map<string, OrganizationSubscription>();
  const actorSubscriptions = new Map<string, ActorSubscription>();
  const audit: PlanChangeAuditEntry[] = [];
  const usage = new Map<string, { key: string; period: string }>();
  const allowed = new Set<string>();

  const catalog: PlanCatalogPort = {
    findOrganizationPlan: async (key) =>
      DEFAULT_ORGANIZATION_PLANS.find((p) => p.key === key) ?? null,
    findActorAddOn: async (key) => DEFAULT_ACTOR_ADD_ONS.find((p) => p.key === key) ?? null,
    listOrganizationPlans: async () => DEFAULT_ORGANIZATION_PLANS,
  };
  const assignmentTails = new Map<OrganizationId, Promise<void>>();
  const subscriptionRepository: SubscriptionRepository = {
    async withOrganizationLock<T>(id: OrganizationId, operation: () => Promise<T>) {
      const previous = assignmentTails.get(id) ?? Promise.resolve();
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tail = previous.then(() => promise);
      assignmentTails.set(id, tail);
      await previous;
      try {
        return await operation();
      } finally {
        release();
        if (assignmentTails.get(id) === tail) assignmentTails.delete(id);
      }
    },
    findForOrganization: async (id) => organizationSubscriptions.get(id) ?? null,
    findForActor: async (id) => actorSubscriptions.get(id) ?? null,
    save: async (subscription) => {
      if (isOrganizationSubscription(subscription)) {
        organizationSubscriptions.set(subscription.subject.organizationId, subscription);
      } else {
        actorSubscriptions.set(subscription.subject.actorId, subscription);
      }
    },
  };
  const auditRepository: PlanChangeAuditRepository = {
    append: async (entry) => {
      audit.push(entry);
    },
    listForOrganization: async (organizationId, limit) =>
      audit
        .filter(
          (e) => e.subject.type === "organization" && e.subject.organizationId === organizationId,
        )
        .slice(-limit)
        .reverse(),
  };
  const countFor = (organizationId: OrganizationId, quota: string, period: string) =>
    [...usage.entries()].filter(
      ([id, entry]) => id.startsWith(`${organizationId}:${quota}:`) && entry.period === period,
    ).length;
  const ledger: QuotaLedgerPort = {
    consume: async (request) => {
      const id = `${request.organizationId}:${request.quota}:${request.usageKey}`;
      const used = countFor(request.organizationId, request.quota, request.periodKey);
      if (usage.has(id)) return { outcome: "replayed", used };
      if (request.limit !== null && used >= request.limit) return { outcome: "exhausted", used };
      usage.set(id, { key: request.usageKey, period: request.periodKey });
      return { outcome: "consumed", used: used + 1 };
    },
    release: async (input) => {
      usage.delete(`${input.organizationId}:${input.quota}:${input.usageKey}`);
    },
    used: async (input) => countFor(input.organizationId, input.quota, input.periodKey),
  };
  const authorization: AuthorizationPort = {
    decide: async (request) => ({
      allowed: allowed.has(`${request.actorId}:${request.permission}`),
      permission: request.permission,
      scope: request.scope,
      reason: allowed.has(`${request.actorId}:${request.permission}`) ? "allowed" : "no-assignment",
    }),
    getEffectiveAccess: async () => {
      throw new Panic("getEffectiveAccess is not used by billing");
    },
  };
  const clock = { now: () => now };
  const resolve = new ResolveOrganizationEntitlementsUseCase({
    catalog,
    subscriptions: subscriptionRepository,
    clock,
  });

  return {
    catalog,
    subscriptions: subscriptionRepository,
    audit: auditRepository,
    auditEntries: audit,
    ledger,
    authorization,
    clock,
    ids: { generate: () => `id-${++counter}` },
    transaction: { runInTransaction: <T>(operation: () => Promise<T>) => operation() },
    resolve,
    consume: new ConsumeOrganizationQuotaUseCase({ resolve, ledger, clock }),
    allow(actorId: ActorId, permission: Permission) {
      allowed.add(`${actorId}:${permission}`);
    },
    setNow(next: Date) {
      now = next;
    },
  };
}
