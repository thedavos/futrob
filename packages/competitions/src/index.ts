export type {
  CompetitionMatchRules,
  ResolutionMode,
} from "./domain/value-objects/resolution-mode.ts";
export type {
  Competition,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
  CompetitionStatus,
} from "./domain/entities/competition.ts";
export type { CompetitionRules } from "./domain/entities/competition-rules.ts";
export type {
  CompetitionMembership,
  CompetitionMembershipRole,
} from "./domain/entities/competition-membership.ts";
export type { CompetitionMembershipRepository } from "./domain/ports/competition-membership.repository.ts";
export type {
  CompetitionDraft,
  CompetitionRepository,
} from "./domain/ports/competition.repository.ts";

export {
  CompetitionNotFound,
  InvalidCompetitionName,
  InvalidCompetitionGameEdition,
  InvalidCompetitionTimeZone,
  CompetitionCreationKeyConflict,
  EntryCreationKeyConflict,
  type CreateCompetitionDraftError,
  type JoinCompetitionError,
  type RegisterTeamEntryError,
} from "./domain/errors/competition.errors.ts";

export {
  CreateCompetitionDraftUseCase,
  type CreateCompetitionDraftInput,
} from "./application/create-competition-draft/create-competition-draft.use-case.ts";
export { GetCompetitionDraftUseCase } from "./application/get-competition-draft/get-competition-draft.use-case.ts";
export {
  JoinCompetitionUseCase,
  type JoinCompetitionInput,
} from "./application/join-competition/join-competition.use-case.ts";
export type {
  CompetitionEntry,
  CompetitionEntryStatus,
} from "./domain/entities/competition-entry.ts";
export type { CompetitionEntryRepository } from "./domain/ports/competition-entry.repository.ts";
export {
  RegisterTeamEntryUseCase,
  type RegisterTeamEntryInput,
} from "./application/register-team-entry/register-team-entry.use-case.ts";
export { GetTeamEntryUseCase } from "./application/get-team-entry/get-team-entry.use-case.ts";
