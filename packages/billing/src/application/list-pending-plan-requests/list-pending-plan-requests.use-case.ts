import { err, ok, type ActorId, type AuthorizationPort, type Result } from "@futrob/shared-kernel";
import type { PlanRequest } from "../../domain/entities/plan-request.ts";
import {
  BillingForbidden,
  type ListPendingPlanRequestsError,
} from "../../domain/errors/billing.errors.ts";
import { BILLING_PERMISSION } from "../../domain/policies/billing-permissions.ts";
import type { PlanRequestRepository } from "../../domain/ports/plan-request.repository.ts";

const PENDING_LIMIT = 100;

/** The superuser's queue of organizations waiting for a plan. */
export class ListPendingPlanRequestsUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly requests: PlanRequestRepository;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
  }): Promise<Result<readonly PlanRequest[], ListPendingPlanRequestsError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: BILLING_PERMISSION.plansAssign,
      scope: {},
    });
    if (!decision.allowed) {
      return err(
        new BillingForbidden({
          code: "billing.forbidden",
          message: "Only a platform superuser can read plan requests",
          permission: BILLING_PERMISSION.plansAssign,
        }),
      );
    }
    return ok(await this.deps.requests.listPending(PENDING_LIMIT));
  }
}
