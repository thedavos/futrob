import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type {
  OrganizationSubscription,
  SubscriptionState,
} from "../../domain/entities/subscription.ts";
import {
  BillingForbidden,
  InvalidSubscription,
  PlanNotFound,
  type AssignOrganizationPlanError,
} from "../../domain/errors/billing.errors.ts";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import type { PlanCatalogPort } from "../../domain/ports/plan-catalog.port.ts";
import type {
  PlanChangeAuditRepository,
  SubscriptionRepository,
} from "../../domain/ports/subscription.repository.ts";
import type { OrganizationPlanKey } from "../../domain/value-objects/plan-key.ts";

/** Requested state; transition timestamps come from the clock. */
export type RequestedSubscriptionState =
  | { readonly status: "active" }
  | { readonly status: "trialing"; readonly trialEndsAt: Date }
  | { readonly status: "past_due" }
  | { readonly status: "canceled" };

export interface AssignOrganizationPlanInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly planKey: OrganizationPlanKey;
  readonly state: RequestedSubscriptionState;
  readonly reason: string;
}

const MAX_REASON_LENGTH = 500;

/** Phase 0 manual assignment by a platform superuser (ADR-0025). */
export class AssignOrganizationPlanUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly catalog: PlanCatalogPort;
      readonly subscriptions: SubscriptionRepository;
      readonly audit: PlanChangeAuditRepository;
      readonly transaction: TransactionPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: AssignOrganizationPlanInput,
  ): Promise<Result<OrganizationSubscription, AssignOrganizationPlanError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: BILLING_PERMISSION.plansAssign,
      scope: { organizationId: input.organizationId },
    });
    if (!decision.allowed) {
      return err(
        new BillingForbidden({
          code: "billing.forbidden",
          message: "Only a platform superuser can assign plans",
          permission: BILLING_PERMISSION.plansAssign,
        }),
      );
    }
    const reason = input.reason.trim();
    if (reason.length === 0 || reason.length > MAX_REASON_LENGTH) {
      return err(
        new InvalidSubscription({
          code: "billing.invalid_subscription",
          message: "A plan change needs a reason of up to 500 characters",
        }),
      );
    }
    const now = this.deps.clock.now();
    if (input.state.status === "trialing" && input.state.trialEndsAt.getTime() <= now.getTime()) {
      return err(
        new InvalidSubscription({
          code: "billing.invalid_subscription",
          message: "A trial must end in the future",
        }),
      );
    }
    if (!(await this.deps.catalog.findOrganizationPlan(input.planKey))) {
      return err(
        new PlanNotFound({
          code: "billing.plan_not_found",
          message: "Plan not found in the catalog",
          planKey: input.planKey,
        }),
      );
    }

    return this.deps.subscriptions.withOrganizationLock(input.organizationId, () =>
      this.deps.transaction.runInTransaction(async () => {
        const before = await this.deps.subscriptions.findForOrganization(input.organizationId);
        const subscription: OrganizationSubscription = {
          id: before?.id ?? this.deps.ids.generate(),
          subject: { type: "organization", organizationId: input.organizationId },
          planKey: input.planKey,
          state: stampState(input.state, now),
          createdAt: before?.createdAt ?? now,
          updatedAt: now,
        };
        await this.deps.subscriptions.save(subscription);
        await this.deps.audit.append({
          id: this.deps.ids.generate(),
          subject: subscription.subject,
          changedByActorId: input.actorId,
          before: before ? { planKey: before.planKey, state: before.state } : null,
          after: { planKey: subscription.planKey, state: subscription.state },
          reason,
          occurredAt: now,
        });
        return ok(subscription);
      }),
    );
  }
}

function stampState(state: RequestedSubscriptionState, now: Date): SubscriptionState {
  switch (state.status) {
    case "active":
      return { status: "active" };
    case "trialing":
      return { status: "trialing", trialEndsAt: state.trialEndsAt };
    case "past_due":
      return { status: "past_due", pastDueSince: now };
    case "canceled":
      return { status: "canceled", canceledAt: now };
  }
}
