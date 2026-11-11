import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type OrganizationId,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import {
  BillingForbidden,
  type CancelOrganizationPlanRequestError,
} from "../../domain/errors/billing.errors.ts";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import type { PlanRequestRepository } from "../../domain/ports/plan-request.repository.ts";
import type { SubscriptionRepository } from "../../domain/ports/subscription.repository.ts";

/** The way out of a plan request: the organizer withdraws it before a superuser acts. */
export class CancelOrganizationPlanRequestUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly subscriptions: Pick<SubscriptionRepository, "withOrganizationLock">;
      readonly requests: PlanRequestRepository;
      readonly transaction: TransactionPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
  }): Promise<Result<void, CancelOrganizationPlanRequestError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: BILLING_PERMISSION.plansRequest,
      scope: { organizationId: input.organizationId },
    });
    if (!decision.allowed) {
      return err(
        new BillingForbidden({
          code: "billing.forbidden",
          message: "The actor cannot cancel a plan request for this organization",
          permission: BILLING_PERMISSION.plansRequest,
        }),
      );
    }
    return this.deps.subscriptions.withOrganizationLock(input.organizationId, () =>
      this.deps.transaction.runInTransaction(async () => {
        const pending = await this.deps.requests.findPendingForOrganization(input.organizationId);
        if (pending) {
          await this.deps.requests.save({
            ...pending,
            status: "canceled",
            resolvedAt: this.deps.clock.now(),
          });
        }
        return ok(undefined);
      }),
    );
  }
}
