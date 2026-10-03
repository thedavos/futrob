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
import type { GetOfficialSelectionError } from "../../domain/errors/official-selection.errors.ts";
import {
  EncounterNotFound,
  OfficialSelectionForbidden,
} from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import type { TeamRepresentationPort } from "../../domain/ports/team-representation.port.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";
import {
  selectionCommandsFor,
  type SelectionCommand,
} from "../../domain/policies/selection-transitions.ts";
import type {
  OfficialSelectionAllowedAction,
  OfficialSelectionView,
} from "../official-selection-output.ts";
import {
  activeDispute,
  authorizeOperator,
  authorizeTeamActor,
} from "../selection-command-support.ts";

export interface GetOfficialSelectionInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  /** Read as this Team's representative; omit to read as an operator. */
  readonly actingTeamId?: TeamId;
}

const TEAM_COMMANDS: readonly SelectionCommand[] = [
  "propose",
  "confirm",
  "reject",
  "propose_alternative",
  "open_dispute",
];

/**
 * Authorized operational read of an Encounter's selection: proposals, audit
 * entries, dispute and the commands the requester can issue. Only a Team
 * representative of the Encounter or an operator with `results.approve` may read
 * it; it never contains the provider's raw payload.
 */
export class GetOfficialSelectionUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: Pick<OfficialResultRepository, "findApprovedByEncounter">;
      readonly teamRepresentation: TeamRepresentationPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: GetOfficialSelectionInput,
  ): Promise<Result<OfficialSelectionView, GetOfficialSelectionError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter || encounter.organizationId !== input.organizationId) {
      return err(
        new EncounterNotFound({
          code: "results.encounter_not_found",
          message: "Encounter not found",
          encounterId: input.encounterId,
        }),
      );
    }

    const actingTeamId = input.actingTeamId;
    const allowed = actingTeamId
      ? await authorizeTeamActor(this.deps, {
          actorId: input.actorId,
          actingTeamId,
          encounter,
          permission: RESULT_PERMISSION.officialSelectionPropose,
        })
      : await authorizeOperator(this.deps, { actorId: input.actorId, encounter });
    if (!allowed) {
      return err(
        new OfficialSelectionForbidden({
          code: "results.official_selection_forbidden",
          message: "The actor cannot read the official selection of this encounter",
        }),
      );
    }

    const selection = await this.deps.selections.findLatestByEncounter(input.encounterId);
    const [proposals, disputes, actions, approved] = await Promise.all([
      selection ? this.deps.selections.listProposals(selection.id) : [],
      selection ? this.deps.selections.listDisputes(selection.id) : [],
      this.deps.selections.listActions(input.encounterId),
      this.deps.results.findApprovedByEncounter(input.encounterId),
    ]);

    const currentProposal = proposals.find((row) => row.id === selection?.currentProposalId);
    const status = selection?.status ?? null;
    const commands = selectionCommandsFor(status);
    const allowedActions: OfficialSelectionAllowedAction[] = commands.filter((command) => {
      if (!actingTeamId) return !TEAM_COMMANDS.includes(command);
      if (!TEAM_COMMANDS.includes(command)) return false;
      // The proposing Team cannot answer its own proposal.
      if (["confirm", "reject", "propose_alternative"].includes(command)) {
        return (
          currentProposal?.proposingTeamId != null &&
          currentProposal.proposingTeamId !== actingTeamId
        );
      }
      return true;
    });
    const flags = [...actions].reverse().find((action) => action.details?.integrityFlags?.length)
      ?.details?.integrityFlags;

    return ok({
      encounterId: input.encounterId,
      selection,
      proposals,
      actions,
      disputes,
      activeDispute: activeDispute(disputes),
      approvedResultId: approved?.id ?? null,
      integrityFlags: selection?.status === "organizer_review" ? (flags ?? []) : [],
      allowedActions,
    });
  }
}
