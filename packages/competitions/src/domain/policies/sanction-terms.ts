import { err, ok, type Result, type TeamId } from "@futrob/shared-kernel";
import {
  isActiveSanction,
  SANCTION_LIMITS,
  SANCTION_TYPE,
  type CompetitionSanction,
  type SanctionType,
} from "../entities/competition-sanction.ts";
import { InvalidSanction, type InvalidSanctionField } from "../errors/sanction.errors.ts";

export type SanctionTargetInput =
  | { readonly type: "team"; readonly teamId: TeamId }
  | { readonly type: "player"; readonly playerProfileId: string };

export interface SanctionTermsInput {
  readonly target: SanctionTargetInput;
  readonly type: SanctionType;
  readonly reason: string;
  readonly pointsDeducted?: number | null;
  readonly suspensionMatches?: number | null;
  readonly encounterId?: string | null;
}

/** Validated terms: only the detail of the chosen type is set. */
export interface SanctionTerms {
  readonly target: SanctionTargetInput;
  readonly type: SanctionType;
  readonly reason: string;
  readonly pointsDeducted: number | null;
  readonly suspensionMatches: number | null;
  readonly encounterId: string | null;
}

function invalid(field: InvalidSanctionField, message: string): InvalidSanction {
  return new InvalidSanction({ code: "competitions.invalid_sanction", message, field });
}

function isWholeBetween(value: number | null | undefined, max: number): value is number {
  return (
    value !== null && value !== undefined && Number.isInteger(value) && value >= 1 && value <= max
  );
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** A reason for imposing or revoking: trimmed, 3 to 500 characters. */
export function parseSanctionReason(reason: string): Result<string, InvalidSanction> {
  const trimmed = reason.trim();
  if (
    trimmed.length < SANCTION_LIMITS.reasonMinLength ||
    trimmed.length > SANCTION_LIMITS.reasonMaxLength
  ) {
    return err(invalid("reason", "The reason must have between 3 and 500 characters"));
  }
  return ok(trimmed);
}

/**
 * Checks that the type fits its target and carries exactly its own detail (ADR-0028):
 * points come off a Team, an administrative defeat names the Team's encounter, and a
 * suspension counts matches for a Team or a player.
 */
export function parseSanctionTerms(
  input: SanctionTermsInput,
): Result<SanctionTerms, InvalidSanction> {
  const reason = parseSanctionReason(input.reason);
  if (reason.isErr()) return err(reason.error);

  const expects = {
    pointsDeducted: input.type === SANCTION_TYPE.pointsDeduction,
    suspensionMatches: input.type === SANCTION_TYPE.matchSuspension,
    encounterId: input.type === SANCTION_TYPE.administrativeDefeat,
  };
  for (const field of ["pointsDeducted", "suspensionMatches", "encounterId"] as const) {
    if (!expects[field] && isPresent(input[field])) {
      return err(invalid(field, `A ${input.type} sanction does not take ${field}`));
    }
  }
  const teamOnly = expects.pointsDeducted || expects.encounterId;
  if (teamOnly && input.target.type !== "team") {
    return err(invalid("target", `A ${input.type} sanction applies to a Team`));
  }
  if (
    expects.pointsDeducted &&
    !isWholeBetween(input.pointsDeducted, SANCTION_LIMITS.maxPointsDeducted)
  ) {
    return err(invalid("pointsDeducted", "Deduct between 1 and 100 whole points"));
  }
  if (
    expects.suspensionMatches &&
    !isWholeBetween(input.suspensionMatches, SANCTION_LIMITS.maxSuspensionMatches)
  ) {
    return err(invalid("suspensionMatches", "Suspend for between 1 and 20 matches"));
  }
  const encounterId = input.encounterId?.trim() ?? "";
  if (expects.encounterId && encounterId === "") {
    return err(invalid("encounterId", "An administrative defeat names its encounter"));
  }

  return ok({
    target: input.target,
    type: input.type,
    reason: reason.value,
    pointsDeducted: expects.pointsDeducted ? (input.pointsDeducted ?? null) : null,
    suspensionMatches: expects.suspensionMatches ? (input.suspensionMatches ?? null) : null,
    encounterId: expects.encounterId ? encounterId : null,
  });
}

export interface TeamPointDeduction {
  readonly teamId: TeamId;
  readonly points: number;
}

/** Points each Team loses from active deductions, in first-seen order. */
export function activePointDeductions(
  sanctions: readonly CompetitionSanction[],
): readonly TeamPointDeduction[] {
  const byTeam = new Map<TeamId, number>();
  for (const sanction of sanctions) {
    if (!isActiveSanction(sanction) || sanction.type !== SANCTION_TYPE.pointsDeduction) continue;
    byTeam.set(
      sanction.teamId,
      (byTeam.get(sanction.teamId) ?? 0) + (sanction.pointsDeducted ?? 0),
    );
  }
  return [...byTeam].map(([teamId, points]) => ({ teamId, points }));
}
