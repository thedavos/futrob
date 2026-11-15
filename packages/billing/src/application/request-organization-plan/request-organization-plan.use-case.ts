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
import type { PlanRequest } from "../../domain/entities/plan-request.ts";
import {
  BillingForbidden,
  InvalidPlanRequest,
  PlanNotFound,
  type RequestOrganizationPlanError,
} from "../../domain/errors/billing.errors.ts";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import type { PlanCatalogPort } from "../../domain/ports/plan-catalog.port.ts";
import type { PlanRequestRepository } from "../../domain/ports/plan-request.repository.ts";
import type { SubscriptionRepository } from "../../domain/ports/subscription.repository.ts";
import type { OrganizationPlanKey } from "../../domain/value-objects/plan-key.ts";
import type { ResolveOrganizationEntitlementsUseCase } from "../resolve-entitlements/resolve-entitlements.use-case.ts";

export interface RequestOrganizationPlanInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly planKey: OrganizationPlanKey;
}

/**
 * Phase 0 manual purchase: an organizer asks for a paid plan and a platform superuser
 * assigns it once billing happened outside the product (ADR-0025). Nothing is charged here
 * and the plan does not change until the superuser acts.
 */
export class RequestOrganizationPlanUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly catalog: PlanCatalogPort;
      readonly resolve: ResolveOrganizationEntitlementsUseCase;
      readonly subscriptions: Pick<SubscriptionRepository, "withOrganizationLock">;
      readonly requests: PlanRequestRepository;
      readonly transaction: TransactionPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: RequestOrganizationPlanInput,
  ): Promise<Result<PlanRequest, RequestOrganizationPlanError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: BILLING_PERMISSION.plansRequest,
      scope: { organizationId: input.organizationId },
    });
    if (!decision.allowed) {
      return err(
        new BillingForbidden({
          code: "billing.forbidden",
          message: "The actor cannot request a plan for this organization",
          permission: BILLING_PERMISSION.plansRequest,
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
    return this.deps.subscriptions.withOrganizationLock(input.organizationId, async () => {
      // Resolve the plan in force under the lock: a superuser assignment that landed while this
      // request waited must not leave a pending request for the plan it just activated.
      const current = await this.deps.resolve.execute(input.organizationId);
      if (input.planKey === "free" || input.planKey === current.plan.key) {
        return err(
          new InvalidPlanRequest({
            code: "billing.invalid_plan_request",
            message: "Request a paid plan the organization does not have yet",
          }),
        );
      }
      return this.deps.transaction.runInTransaction(async () => {
        const pending = await this.deps.requests.findPendingForOrganization(input.organizationId);
        if (pending?.planKey === input.planKey) return ok(pending);
        const now = this.deps.clock.now();
        if (pending) {
          await this.deps.requests.save({ ...pending, status: "canceled", resolvedAt: now });
        }
        const created: PlanRequest = {
          id: this.deps.ids.generate(),
          organizationId: input.organizationId,
          planKey: input.planKey,
          requestedByActorId: input.actorId,
          status: "pending",
          createdAt: now,
          resolvedAt: null,
        };
        await this.deps.requests.save(created);
        return ok(created);
      });
    });
  }
}
