import type {
  CompetitionEntryStatusDto,
  CompetitionRosterMembershipDto,
} from "@futrob/api-contracts";

export type CaptainTeamScope = {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly teamId: string;
};

export type CaptainTeamAccess =
  | { readonly kind: "loading" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "no-team" }
  | { readonly kind: "forbidden"; readonly scope: CaptainTeamScope }
  | { readonly kind: "ready"; readonly scope: CaptainTeamScope };

/** The API only accepts roster changes while the entry is pending or approved. */
export function isRosterWritable(status: CompetitionEntryStatusDto): boolean {
  return status === "pending" || status === "approved";
}

/**
 * Resolves the actor's team in the competition and whether the page permission is granted.
 * Presentation gate only: the API enforces the same permissions on every call.
 */
export function resolveCaptainTeamAccess(input: {
  readonly competitionId: string;
  /** Organization from the route; `null` on personal routes, where the membership provides it. */
  readonly organizationId: string | null;
  readonly teamsStatus: "pending" | "error" | "success";
  /** The actor's roster membership in the competition, if any. */
  readonly membership: CompetitionRosterMembershipDto | undefined;
  readonly capability: {
    readonly allowed: boolean;
    readonly loading: boolean;
    readonly unavailable: boolean;
  };
}): CaptainTeamAccess {
  if (input.teamsStatus === "error") return { kind: "unavailable" };
  if (input.teamsStatus === "pending") return { kind: "loading" };

  const { membership } = input;
  if (!membership) return { kind: "no-team" };
  if (input.organizationId !== null && membership.organizationId !== input.organizationId) {
    return { kind: "no-team" };
  }

  const scope: CaptainTeamScope = {
    organizationId: membership.organizationId,
    competitionId: membership.competitionId,
    teamId: membership.teamId,
  };
  if (input.capability.unavailable) return { kind: "unavailable" };
  if (input.capability.loading) return { kind: "loading" };
  return input.capability.allowed ? { kind: "ready", scope } : { kind: "forbidden", scope };
}
