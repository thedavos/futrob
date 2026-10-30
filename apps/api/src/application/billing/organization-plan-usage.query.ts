import type {
  GetOrganizationPlanUseCase,
  OrganizationPlanOverview,
  BillingForbidden,
} from "@futrob/billing";
import { isActiveCompetitionStatus, type CompetitionRepository } from "@futrob/competitions";
import type { MembershipRepository } from "@futrob/organizations";
import { ok, type ActorId, type OrganizationId, type Result } from "@futrob/shared-kernel";

export interface OrganizationPlanUsage extends OrganizationPlanOverview {
  readonly usage: { readonly activeCompetitions: number; readonly staffMembers: number };
}

/**
 * The plan page needs counts that billing does not own. Each context counts its own
 * resources with the same rules its limit enforcement uses.
 */
export class OrganizationPlanUsageQuery {
  constructor(
    private readonly deps: {
      readonly plan: GetOrganizationPlanUseCase;
      readonly competitions: Pick<CompetitionRepository, "listByOrganization">;
      readonly memberships: Pick<MembershipRepository, "countByRole">;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
  }): Promise<Result<OrganizationPlanUsage, BillingForbidden>> {
    const overview = await this.deps.plan.execute(input);
    if (!overview.isOk()) return overview;
    const [competitions, organizers, staff] = await Promise.all([
      this.deps.competitions.listByOrganization(input.organizationId),
      this.deps.memberships.countByRole(input.organizationId, "organizer"),
      this.deps.memberships.countByRole(input.organizationId, "staff"),
    ]);
    return ok({
      ...overview.value,
      usage: {
        activeCompetitions: competitions.filter((competition) =>
          isActiveCompetitionStatus(competition.status),
        ).length,
        staffMembers: organizers + staff,
      },
    });
  }
}
