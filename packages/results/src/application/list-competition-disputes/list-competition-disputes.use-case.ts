import {
  err,
  ok,
  type ActorId,
  type AuthorizationBatchPort,
  type AuthorizationPort,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import { OfficialSelectionForbidden } from "../../domain/errors/select-official-matches.errors.ts";
import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
} from "../../domain/ports/encounter-reader.port.ts";
import type {
  SelectionDisputeReaderPort,
  SelectionUnderDispute,
} from "../../domain/ports/selection-dispute-reader.port.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";

export interface ListCompetitionDisputesInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

/** One Encounter whose selection waits on an operator decision. */
export interface CompetitionDisputeCase {
  readonly encounterId: EncounterId;
  readonly status: "disputed" | "organizer_review";
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly scheduledStartAt: Date;
  /** When the selection entered its current status. */
  readonly since: Date;
  /** Summary of the active dispute; its reason stays on the Encounter's dispute section. */
  readonly dispute: Pick<
    MatchDispute,
    "id" | "status" | "openedByTeamId" | "openedAt" | "reviewStartedAt"
  > | null;
}

/**
 * Operator queue of a competition: the selections in `disputed` or
 * `organizer_review`. Each Encounter is decided on its own `results.approve` scope,
 * so a specific deny hides it; an actor without the capability anywhere in the
 * competition is refused instead of shown an empty queue.
 */
export class ListCompetitionDisputesUseCase {
  constructor(
    private readonly deps: {
      readonly disputes: SelectionDisputeReaderPort;
      readonly encounterReader: EncounterReaderPort;
      readonly authorization: Pick<AuthorizationPort, "decide"> & AuthorizationBatchPort;
    },
  ) {}

  async execute(
    input: ListCompetitionDisputesInput,
  ): Promise<Result<readonly CompetitionDisputeCase[], OfficialSelectionForbidden>> {
    const scope = { organizationId: input.organizationId, competitionId: input.competitionId };
    const underDispute = await this.deps.disputes.listUnderDispute(scope);
    const located = (
      await Promise.all(underDispute.map((entry) => this.locate(input, entry)))
    ).filter((entry) => entry !== null);

    const decisions = await this.deps.authorization.decideEach({
      actorId: input.actorId,
      permission: RESULT_PERMISSION.resultApprove,
      scopes: located.map(({ encounter }) => ({ ...scope, encounterId: encounter.encounterId })),
    });
    const visible = located.filter((_, index) => decisions[index]?.allowed === true);
    if (visible.length === 0) {
      const competitionDecision = await this.deps.authorization.decide({
        actorId: input.actorId,
        permission: RESULT_PERMISSION.resultApprove,
        scope,
      });
      if (!competitionDecision.allowed) {
        return err(
          new OfficialSelectionForbidden({
            code: "results.official_selection_forbidden",
            message: "The actor cannot review the disputes of this competition",
          }),
        );
      }
    }

    return ok(visible.map(toCase));
  }

  /** Drops a case whose Encounter vanished or moved out of the requested tenant. */
  private async locate(
    input: ListCompetitionDisputesInput,
    entry: SelectionUnderDispute,
  ): Promise<(SelectionUnderDispute & { readonly encounter: EncounterScheduleSnapshot }) | null> {
    const encounter = await this.deps.encounterReader.getById(entry.selection.encounterId);
    if (
      !encounter ||
      encounter.organizationId !== input.organizationId ||
      encounter.competitionId !== input.competitionId
    ) {
      return null;
    }
    return { ...entry, encounter };
  }
}

function toCase({
  selection,
  activeDispute,
  encounter,
}: SelectionUnderDispute & {
  readonly encounter: EncounterScheduleSnapshot;
}): CompetitionDisputeCase {
  return {
    encounterId: encounter.encounterId,
    status: selection.status === "disputed" ? "disputed" : "organizer_review",
    homeTeamId: encounter.homeTeamId,
    awayTeamId: encounter.awayTeamId,
    scheduledStartAt: encounter.scheduledStartAt,
    since: selection.updatedAt,
    dispute: activeDispute
      ? {
          id: activeDispute.id,
          status: activeDispute.status,
          openedByTeamId: activeDispute.openedByTeamId,
          openedAt: activeDispute.openedAt,
          reviewStartedAt: activeDispute.reviewStartedAt,
        }
      : null,
  };
}
