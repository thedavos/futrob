import {
  isActorAddOnKey,
  isOrganizationPlanKey,
  type ActorSubscription,
  type OrganizationSubscription,
  type PlanChangeAuditEntry,
  type PlanChangeAuditRepository,
  type PlanChangeSnapshot,
  type Subscription,
  type SubscriptionRepository,
  type SubscriptionState,
} from "@futrob/billing";
import {
  asActorId,
  asOrganizationId,
  Panic,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgJsonInputSchema } from "@/adapters/persistence/parse-json-column.ts";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const subscriptionRowSchema = z.object({
  id: z.string(),
  subject_type: z.enum(["organization", "actor"]),
  organization_id: z.string().nullable(),
  actor_id: z.string().nullable(),
  plan_key: z.string(),
  status: z.enum(["trialing", "active", "past_due", "canceled"]),
  trial_ends_at: pgTimestampSchema.nullable(),
  past_due_since: pgTimestampSchema.nullable(),
  canceled_at: pgTimestampSchema.nullable(),
  created_at: pgTimestampSchema,
  updated_at: pgTimestampSchema,
});

type SubscriptionRow = z.infer<typeof subscriptionRowSchema>;

function stateFromRow(row: SubscriptionRow): SubscriptionState {
  switch (row.status) {
    case "active":
      return { status: "active" };
    case "trialing":
      return { status: "trialing", trialEndsAt: required(row.trial_ends_at, "trial_ends_at") };
    case "past_due":
      return { status: "past_due", pastDueSince: required(row.past_due_since, "past_due_since") };
    case "canceled":
      return { status: "canceled", canceledAt: required(row.canceled_at, "canceled_at") };
  }
}

function required(value: Date | null, column: string): Date {
  if (!value) throw new Panic(`billing_subscriptions.${column} violates its status check`);
  return value;
}

function stateColumns(state: SubscriptionState) {
  return {
    trialEndsAt: state.status === "trialing" ? state.trialEndsAt.toISOString() : null,
    pastDueSince: state.status === "past_due" ? state.pastDueSince.toISOString() : null,
    canceledAt: state.status === "canceled" ? state.canceledAt.toISOString() : null,
  };
}

const UPSERT_COLUMNS = `id, subject_type, organization_id, actor_id, plan_key, status,
  trial_ends_at, past_due_since, canceled_at, created_at, updated_at`;

export class PostgresSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly pool: Pool) {}

  async findForOrganization(organizationId: OrganizationId) {
    const result = await getPgExecutor(this.pool).query(
      "SELECT * FROM billing_subscriptions WHERE organization_id = $1",
      [organizationId],
    );
    const row = result.rows[0] ? subscriptionRowSchema.parse(result.rows[0]) : null;
    if (!row?.organization_id || !isOrganizationPlanKey(row.plan_key)) return null;
    const subscription: OrganizationSubscription = {
      id: row.id,
      subject: { type: "organization", organizationId: asOrganizationId(row.organization_id) },
      planKey: row.plan_key,
      state: stateFromRow(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return subscription;
  }

  async findForActor(actorId: ActorId) {
    const result = await getPgExecutor(this.pool).query(
      "SELECT * FROM billing_subscriptions WHERE actor_id = $1",
      [actorId],
    );
    const row = result.rows[0] ? subscriptionRowSchema.parse(result.rows[0]) : null;
    if (!row?.actor_id || !isActorAddOnKey(row.plan_key)) return null;
    const subscription: ActorSubscription = {
      id: row.id,
      subject: { type: "actor", actorId: asActorId(row.actor_id) },
      planKey: row.plan_key,
      state: stateFromRow(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return subscription;
  }

  async save(subscription: Subscription): Promise<void> {
    const subject = subscription.subject;
    const conflict =
      subject.type === "organization"
        ? "(organization_id) WHERE organization_id IS NOT NULL"
        : "(actor_id) WHERE actor_id IS NOT NULL";
    const columns = stateColumns(subscription.state);
    await getPgExecutor(this.pool).query(
      `INSERT INTO billing_subscriptions (${UPSERT_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT ${conflict} DO UPDATE SET
         plan_key = EXCLUDED.plan_key,
         status = EXCLUDED.status,
         trial_ends_at = EXCLUDED.trial_ends_at,
         past_due_since = EXCLUDED.past_due_since,
         canceled_at = EXCLUDED.canceled_at,
         updated_at = EXCLUDED.updated_at`,
      [
        subscription.id,
        subject.type,
        subject.type === "organization" ? subject.organizationId : null,
        subject.type === "actor" ? subject.actorId : null,
        subscription.planKey,
        subscription.state.status,
        columns.trialEndsAt,
        columns.pastDueSince,
        columns.canceledAt,
        subscription.createdAt.toISOString(),
        subscription.updatedAt.toISOString(),
      ],
    );
  }
}

const snapshotSchema = z.object({
  planKey: z.string(),
  state: z.discriminatedUnion("status", [
    z.object({ status: z.literal("active") }),
    z.object({ status: z.literal("trialing"), trialEndsAt: z.coerce.date() }),
    z.object({ status: z.literal("past_due"), pastDueSince: z.coerce.date() }),
    z.object({ status: z.literal("canceled"), canceledAt: z.coerce.date() }),
  ]),
});

const planChangeRowSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  changed_by_actor_id: z.string(),
  before_json: z.null().or(pgJsonInputSchema.pipe(snapshotSchema)),
  after_json: pgJsonInputSchema.pipe(snapshotSchema),
  reason: z.string(),
  occurred_at: pgTimestampSchema,
});

function toSnapshot(parsed: z.infer<typeof snapshotSchema>): PlanChangeSnapshot {
  if (!isOrganizationPlanKey(parsed.planKey) && !isActorAddOnKey(parsed.planKey)) {
    throw new Panic(`billing_plan_changes references unknown plan ${parsed.planKey}`);
  }
  return { planKey: parsed.planKey, state: parsed.state };
}

export class PostgresPlanChangeAuditRepository implements PlanChangeAuditRepository {
  constructor(private readonly pool: Pool) {}

  async append(entry: PlanChangeAuditEntry): Promise<void> {
    const subject = entry.subject;
    await getPgExecutor(this.pool).query(
      `INSERT INTO billing_plan_changes (
         id, subject_type, organization_id, actor_id, changed_by_actor_id,
         before_json, after_json, reason, occurred_at
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)`,
      [
        entry.id,
        subject.type,
        subject.type === "organization" ? subject.organizationId : null,
        subject.type === "actor" ? subject.actorId : null,
        entry.changedByActorId,
        entry.before ? JSON.stringify(entry.before) : null,
        JSON.stringify(entry.after),
        entry.reason,
        entry.occurredAt.toISOString(),
      ],
    );
  }

  async listForOrganization(organizationId: OrganizationId, limit: number) {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, changed_by_actor_id, before_json, after_json, reason, occurred_at
       FROM billing_plan_changes
       WHERE organization_id = $1
       ORDER BY occurred_at DESC, id DESC
       LIMIT $2`,
      [organizationId, limit],
    );
    return result.rows.map((raw): PlanChangeAuditEntry => {
      const row = planChangeRowSchema.parse(raw);
      return {
        id: row.id,
        subject: { type: "organization", organizationId: asOrganizationId(row.organization_id) },
        changedByActorId: asActorId(row.changed_by_actor_id),
        before: row.before_json === null ? null : toSnapshot(row.before_json),
        after: toSnapshot(row.after_json),
        reason: row.reason,
        occurredAt: row.occurred_at,
      };
    });
  }
}

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly organizations = new Map<OrganizationId, OrganizationSubscription>();
  private readonly actors = new Map<ActorId, ActorSubscription>();

  async findForOrganization(organizationId: OrganizationId) {
    return this.organizations.get(organizationId) ?? null;
  }

  async findForActor(actorId: ActorId) {
    return this.actors.get(actorId) ?? null;
  }

  async save(subscription: Subscription): Promise<void> {
    if (
      subscription.subject.type === "organization" &&
      isOrganizationPlanKey(subscription.planKey)
    ) {
      this.organizations.set(subscription.subject.organizationId, {
        ...subscription,
        subject: subscription.subject,
        planKey: subscription.planKey,
      });
    } else if (subscription.subject.type === "actor" && isActorAddOnKey(subscription.planKey)) {
      this.actors.set(subscription.subject.actorId, {
        ...subscription,
        subject: subscription.subject,
        planKey: subscription.planKey,
      });
    }
  }
}

export class InMemoryPlanChangeAuditRepository implements PlanChangeAuditRepository {
  private readonly entries: PlanChangeAuditEntry[] = [];

  async append(entry: PlanChangeAuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async listForOrganization(organizationId: OrganizationId, limit: number) {
    return [...this.entries]
      .reverse()
      .filter(
        (entry) =>
          entry.subject.type === "organization" && entry.subject.organizationId === organizationId,
      )
      .slice(0, limit);
  }
}
