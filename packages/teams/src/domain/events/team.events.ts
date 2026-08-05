import type { DomainEvent } from "@futrob/shared-kernel";

export type RosterLockedEvent = DomainEvent<
  "teams.roster-locked",
  {
    readonly organizationId: string;
    readonly competitionId: string;
    readonly teamId: string;
    readonly lockedAt: string;
  }
>;

export type ExternalClubConnectedEvent = DomainEvent<
  "teams.external-club-connected",
  {
    readonly teamId: string;
    readonly providerKey: string;
    readonly externalClubId: string;
    readonly verifiedAt: string | null;
  }
>;
