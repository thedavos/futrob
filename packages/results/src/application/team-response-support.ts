import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type EncounterId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../domain/entities/official-match-selection.ts";
import { SelectionNotFound } from "../domain/errors/official-result.errors.ts";
import {
  SelfConfirmationForbidden,
  type CommandKeyReused,
  type SelectionAlreadyApproved,
  type SelectionProposalStale,
  type SelectionStateConflict,
  type SelectionVersionConflict,
} from "../domain/errors/official-selection.errors.ts";
import {
  EncounterNotFound,
  OfficialSelectionForbidden,
} from "../domain/errors/select-official-matches.errors.ts";
import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
} from "../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../domain/ports/official-result.repository.ts";
import type { TeamRepresentationPort } from "../domain/ports/team-representation.port.ts";
import { RESULT_PERMISSION } from "../domain/policies/result-permissions.ts";
import type { SelectionCommand } from "../domain/policies/selection-transitions.ts";
import type { OfficialSelectionCommandOutput } from "./official-selection-output.ts";
import {
  approvedGuard,
  authorizeTeamActor,
  staleProposal,
  statusConflict,
  versionConflict,
} from "./selection-command-support.ts";
import { lookupReplay, replayOutput } from "./selection-replay.ts";
import type { CommandFingerprint } from "./command-fingerprint.ts";

export type TeamResponseError =
  | EncounterNotFound
  | OfficialSelectionForbidden
  | SelectionNotFound
  | SelectionVersionConflict
  | SelectionProposalStale
  | SelectionStateConflict
  | SelectionAlreadyApproved
  | SelfConfirmationForbidden
  | CommandKeyReused;

export type TeamResponseContext =
  | { readonly kind: "replay"; readonly output: OfficialSelectionCommandOutput }
  | {
      readonly kind: "ready";
      readonly encounter: EncounterScheduleSnapshot;
      readonly selection: OfficialMatchSelection;
      readonly proposal: OfficialSelectionProposal;
    };

/**
 * Shared front half of the rival Team's responses (reject, alternative): the
 * Team must be the actor's, the version and proposal must be the ones on the
 * table, and the responder must not be the proposing Team.
 */
export async function prepareTeamResponse(
  deps: {
    readonly encounterReader: EncounterReaderPort;
    readonly selections: OfficialMatchSelectionRepository;
    readonly results: Pick<OfficialResultRepository, "findById">;
    readonly teamRepresentation: TeamRepresentationPort;
    readonly authorization: AuthorizationPort;
  },
  input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly encounterId: EncounterId;
    readonly actingTeamId: TeamId;
    readonly proposalId: string;
    readonly expectedVersion: number;
    readonly commandKey: string;
    readonly command: Extract<SelectionCommand, "reject" | "propose_alternative">;
    readonly fingerprint: CommandFingerprint;
  },
): Promise<Result<TeamResponseContext, TeamResponseError>> {
  const encounter = await deps.encounterReader.getById(input.encounterId);
  if (!encounter || encounter.organizationId !== input.organizationId) {
    return err(
      new EncounterNotFound({
        code: "results.encounter_not_found",
        message: "Encounter not found",
        encounterId: input.encounterId,
      }),
    );
  }
  const allowed = await authorizeTeamActor(deps, {
    actorId: input.actorId,
    actingTeamId: input.actingTeamId,
    encounter,
    permission: RESULT_PERMISSION.officialSelectionResolve,
  });
  if (!allowed) {
    return err(
      new OfficialSelectionForbidden({
        code: "results.official_selection_forbidden",
        message: "The actor cannot respond to this official selection for this team",
      }),
    );
  }

  const replay = await lookupReplay(deps.selections, input);
  if (replay.kind === "reused") return err(replay.error);
  if (replay.kind === "replay") {
    const output = await replayOutput(deps, input.encounterId, replay.actions);
    if (output) return ok({ kind: "replay", output });
  }

  const selection = await deps.selections.findLatestByEncounter(input.encounterId);
  if (!selection) {
    return err(
      new SelectionNotFound({
        code: "results.selection_not_found",
        message: "No official selection to respond to",
        encounterId: input.encounterId,
      }),
    );
  }
  const approved = approvedGuard(selection, input.command, input.encounterId);
  if (approved) return err(approved);
  if (selection.version !== input.expectedVersion) {
    return err(versionConflict(input.expectedVersion, selection.version));
  }
  if (selection.currentProposalId !== input.proposalId) {
    return err(staleProposal(input.proposalId));
  }
  const conflict = statusConflict(selection, input.command, input.encounterId);
  if (conflict) return err(conflict);

  const proposals = await deps.selections.listProposals(selection.id);
  const proposal = proposals.find((row) => row.id === input.proposalId);
  if (!proposal) return err(staleProposal(input.proposalId));
  if (proposal.proposingTeamId === null || proposal.proposingTeamId === input.actingTeamId) {
    return err(
      new SelfConfirmationForbidden({
        code: "results.self_confirmation_forbidden",
        message: "Only the rival of the proposing team can respond to a proposal",
      }),
    );
  }
  return ok({ kind: "ready", encounter, selection, proposal });
}
