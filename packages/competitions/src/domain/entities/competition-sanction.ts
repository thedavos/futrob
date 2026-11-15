import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/** Who a sanction falls on: a Team entered in the competition, or one of its players. */
export const SANCTION_TARGET = {
  team: "team",
  player: "player",
} as const;

export type SanctionTargetType = (typeof SANCTION_TARGET)[keyof typeof SANCTION_TARGET];

export const SANCTION_TYPE = {
  warning: "warning",
  pointsDeduction: "points_deduction",
  matchSuspension: "match_suspension",
  administrativeDefeat: "administrative_defeat",
} as const;

export type SanctionType = (typeof SANCTION_TYPE)[keyof typeof SANCTION_TYPE];

export const SANCTION_TYPES = Object.values(SANCTION_TYPE);

export const SANCTION_LIMITS = {
  reasonMinLength: 3,
  reasonMaxLength: 500,
  maxPointsDeducted: 100,
  maxSuspensionMatches: 20,
} as const;

/** Who withdrew a sanction, why and when. Written once; the sanction itself stays. */
export interface SanctionRevocation {
  readonly actorId: ActorId;
  readonly at: Date;
  readonly reason: string;
  /** Correlation of the request that revoked it. */
  readonly requestId: string;
}

/**
 * A disciplinary decision of the organizer inside one competition (ADR-0028). It is never
 * deleted: revoking it records a `SanctionRevocation` and keeps the original audit trail.
 */
export interface CompetitionSanction {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly targetType: SanctionTargetType;
  /** The sanctioned Team, or the Team whose roster the sanctioned player was on. */
  readonly teamId: TeamId;
  /** Set only when `targetType` is `player`. */
  readonly playerProfileId: string | null;
  readonly type: SanctionType;
  /** Set only for `points_deduction`. */
  readonly pointsDeducted: number | null;
  /** Set only for `match_suspension`. */
  readonly suspensionMatches: number | null;
  /** Set only for `administrative_defeat`. */
  readonly encounterId: string | null;
  readonly reason: string;
  readonly imposedByActorId: ActorId;
  readonly imposedAt: Date;
  /** Correlation of the request that imposed it. */
  readonly requestId: string;
  readonly revocation: SanctionRevocation | null;
}

export function isActiveSanction(sanction: CompetitionSanction): boolean {
  return sanction.revocation === null;
}
