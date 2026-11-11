import type {
  BillingForbidden,
  ListPendingPlanRequestsUseCase,
  PlanRequest,
} from "@futrob/billing";
import type { OrganizationRepository } from "@futrob/organizations";
import { ok, type ActorId, type Result } from "@futrob/shared-kernel";

export interface PendingPlanRequestView {
  readonly request: PlanRequest;
  readonly organizationName: string;
}

/**
 * The superuser queue names each organization, which billing does not own. A request whose
 * organization no longer resolves is left out instead of shown nameless.
 */
export class PendingPlanRequestsQuery {
  constructor(
    private readonly deps: {
      readonly pending: ListPendingPlanRequestsUseCase;
      readonly organizations: Pick<OrganizationRepository, "getByIds">;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
  }): Promise<Result<readonly PendingPlanRequestView[], BillingForbidden>> {
    const pending = await this.deps.pending.execute(input);
    if (!pending.isOk()) return pending;
    const organizations = await this.deps.organizations.getByIds(
      pending.value.map((request) => request.organizationId),
    );
    const names = new Map(
      organizations.map((organization) => [organization.id, organization.name]),
    );
    return ok(
      pending.value.flatMap((request) => {
        const organizationName = names.get(request.organizationId);
        return organizationName === undefined ? [] : [{ request, organizationName }];
      }),
    );
  }
}
