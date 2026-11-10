import type { ResolveOrganizationEntitlementsUseCase } from "@futrob/billing";
import type {
  EmailAudience,
  EmailChannelAccessPort,
  EmailRecipientsPort,
} from "@futrob/notifications";
import type { MembershipRepository } from "@futrob/organizations";
import { asActorId, asTeamId, type ActorId, type OrganizationId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembershipRepository, PlayerProfileRepository } from "@futrob/teams";

/** Organization rows are read by its operators, as the organization activity feed is. */
const OPERATOR_ROLES = new Set(["organizer", "staff"]);
const MEMBERSHIP_PAGE = 500;

/**
 * Who reads email for an activity audience, matching who reads that row on the web: operators
 * for the organization, captain and vice-captain of a Team within its competition (ADR-0017),
 * and the actor for a directed row.
 */
export class ActivityAudienceEmailRecipients implements EmailRecipientsPort {
  constructor(
    private readonly deps: {
      readonly memberships: MembershipRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly profiles: PlayerProfileRepository;
    },
  ) {}

  async actorsFor(audience: EmailAudience): Promise<readonly ActorId[]> {
    switch (audience.audience) {
      case "actor":
        return [asActorId(audience.audienceId)];
      case "organization": {
        const members = await this.deps.memberships.listByOrganization(
          audience.organizationId,
          MEMBERSHIP_PAGE,
        );
        return members
          .filter((member) => OPERATOR_ROLES.has(member.role))
          .map((member) => member.actorId);
      }
      case "team": {
        if (!audience.competitionId) return [];
        const roster = await this.deps.rosters.listByTeam(
          audience.organizationId,
          audience.competitionId,
          asTeamId(audience.audienceId),
        );
        const actors: ActorId[] = [];
        for (const member of roster) {
          if (member.role === "player") continue;
          const profile = await this.deps.profiles.findById(member.playerProfileId);
          if (profile) actors.push(profile.actorId);
        }
        return actors;
      }
    }
  }
}

/** Free is web only; Pro and Liga include email (ADR-0025). */
export class BillingEmailChannelAccess implements EmailChannelAccessPort {
  constructor(private readonly resolve: ResolveOrganizationEntitlementsUseCase) {}

  async allowsEmail(organizationId: OrganizationId): Promise<boolean> {
    const { entitlements } = (await this.resolve.execute(organizationId)).plan;
    return entitlements.features.notificationChannels.includes("email");
  }
}
