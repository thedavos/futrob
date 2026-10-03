import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EncounterId,
  type EventPublisherPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  SelectionNotConfirmable,
  SelectionNotFound,
  type ConfirmOfficialSelectionError,
} from "../../domain/errors/official-result.errors.ts";
import { SelfConfirmationForbidden } from "../../domain/errors/official-selection.errors.ts";
import { OfficialSelectionForbidden } from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import type { TeamRepresentationPort } from "../../domain/ports/team-representation.port.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";
import { confirmProposal } from "../confirm-proposal.ts";
import type { OfficialSelectionCommandOutput } from "../official-selection-output.ts";
import {
  authorizeTeamActor,
  commandFingerprint,
  staleProposal,
  statusConflict,
  approvedGuard,
  versionConflict,
} from "../selection-command-support.ts";
import { lookupReplay, replayOutput } from "../selection-replay.ts";

export interface ConfirmOfficialSelectionInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  /** Rival Team the actor speaks for; must differ from the proposing Team. */
  readonly actingTeamId: TeamId;
  /** The exact version being confirmed, not "the latest". */
  readonly proposalId: string;
  readonly expectedVersion: number;
  readonly commandKey: string;
}

/**
 * The rival Team confirms a specific proposal version. Agreement of both Teams
 * approves the result (emitting one snapshot) unless an integrity flag routes
 * the case to organizer review. Operators resolve disputes elsewhere.
 */
export class ConfirmOfficialSelectionUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: OfficialResultRepository;
      readonly associations: EncounterCandidateAssociationRepository;
      readonly providerMatches: ProviderMatchReaderPort;
      readonly teamRepresentation: TeamRepresentationPort;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: ConfirmOfficialSelectionInput,
  ): Promise<Result<OfficialSelectionCommandOutput, ConfirmOfficialSelectionError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter || encounter.organizationId !== input.organizationId) {
      return err(
        new SelectionNotFound({
          code: "results.selection_not_found",
          message: "Encounter selection not found",
          encounterId: input.encounterId,
        }),
      );
    }

    const allowed = await authorizeTeamActor(this.deps, {
      actorId: input.actorId,
      actingTeamId: input.actingTeamId,
      encounter,
      permission: RESULT_PERMISSION.officialSelectionResolve,
    });
    if (!allowed) {
      return err(
        new OfficialSelectionForbidden({
          code: "results.official_selection_forbidden",
          message: "The actor cannot confirm this official selection for this team",
        }),
      );
    }

    const fingerprint = commandFingerprint([
      "confirm",
      input.actingTeamId,
      input.proposalId,
      input.expectedVersion,
    ]);
    const replay = await lookupReplay(this.deps.selections, { ...input, fingerprint });
    if (replay.kind === "reused") return err(replay.error);
    if (replay.kind === "replay") {
      const output = await replayOutput(this.deps, input.encounterId, replay.actions);
      if (output) return ok(output);
    }

    const selection = await this.deps.selections.findLatestByEncounter(input.encounterId);
    if (!selection) {
      return err(
        new SelectionNotFound({
          code: "results.selection_not_found",
          message: "No official selection to confirm",
          encounterId: input.encounterId,
        }),
      );
    }
    const approved = approvedGuard(selection, "confirm", input.encounterId);
    if (approved) return err(approved);
    if (selection.version !== input.expectedVersion) {
      return err(versionConflict(input.expectedVersion, selection.version));
    }
    if (selection.currentProposalId !== input.proposalId) {
      return err(staleProposal(input.proposalId));
    }
    const conflict = statusConflict(selection, "confirm", input.encounterId);
    if (conflict) {
      return err(
        conflict._tag === "SelectionAlreadyApproved"
          ? conflict
          : new SelectionNotConfirmable({
              code: "results.selection_not_confirmable",
              message: `Selection status ${selection.status} cannot be confirmed`,
            }),
      );
    }

    const proposals = await this.deps.selections.listProposals(selection.id);
    const proposal = proposals.find((row) => row.id === input.proposalId);
    if (!proposal) return err(staleProposal(input.proposalId));
    if (proposal.proposingTeamId === null) {
      return err(
        new SelectionNotConfirmable({
          code: "results.selection_not_confirmable",
          message: "The proposing team is unknown; an operator must review this selection",
        }),
      );
    }
    if (proposal.proposingTeamId === input.actingTeamId) {
      return err(
        new SelfConfirmationForbidden({
          code: "results.self_confirmation_forbidden",
          message: "The proposing team cannot confirm its own proposal",
        }),
      );
    }

    return confirmProposal(this.deps, {
      encounter,
      selection,
      proposal,
      actorId: input.actorId,
      teamId: input.actingTeamId,
      commandKey: input.commandKey,
      fingerprint,
    });
  }
}
