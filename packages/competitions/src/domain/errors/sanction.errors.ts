import { TaggedError } from "@futrob/shared-kernel";
import type {
  CompetitionAuthorizationForbidden,
  CompetitionNotFound,
} from "./competition.errors.ts";

export type InvalidSanctionField =
  | "target"
  | "type"
  | "reason"
  | "pointsDeducted"
  | "suspensionMatches"
  | "encounterId";

export class InvalidSanction extends TaggedError("InvalidSanction")<{
  readonly code: "competitions.invalid_sanction";
  readonly message: string;
  readonly field: InvalidSanctionField;
}> {}

/** The Team has no approved entry, the player has no roster, or the match is not theirs. */
export class SanctionTargetNotFound extends TaggedError("SanctionTargetNotFound")<{
  readonly code: "competitions.sanction_target_not_found";
  readonly message: string;
  readonly target: "team" | "player" | "encounter";
}> {}

export class SanctionNotFound extends TaggedError("SanctionNotFound")<{
  readonly code: "competitions.sanction_not_found";
  readonly message: string;
}> {}

export class SanctionAlreadyRevoked extends TaggedError("SanctionAlreadyRevoked")<{
  readonly code: "competitions.sanction_already_revoked";
  readonly message: string;
}> {}

/** Sanctions are imposed and revoked only while the competition is being played or closed. */
export class SanctionsClosed extends TaggedError("SanctionsClosed")<{
  readonly code: "competitions.sanctions_closed";
  readonly message: string;
}> {}

export type ImposeSanctionError =
  | CompetitionAuthorizationForbidden
  | CompetitionNotFound
  | SanctionsClosed
  | InvalidSanction
  | SanctionTargetNotFound;

export type RevokeSanctionError =
  | CompetitionAuthorizationForbidden
  | CompetitionNotFound
  | SanctionsClosed
  | InvalidSanction
  | SanctionNotFound
  | SanctionAlreadyRevoked;

export type ListSanctionsError = CompetitionAuthorizationForbidden | CompetitionNotFound;
