import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EventPublisherPort,
  type IdGeneratorPort,
  type Result,
} from "@futrob/shared-kernel";
import type { OfficialResult } from "../../domain/entities/official-result.ts";
import {
  OfficialResultForbidden,
  OfficialResultNotFound,
  type VoidOfficialResultError,
} from "../../domain/errors/official-result.errors.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";
import { buildAction, normalizeReason, versionConflict } from "../selection-command-support.ts";

export type VoidOfficialResultInput = {
  readonly actorId: ActorId;
  /** Recorded on the selection's audit entry when the void closes an approved selection. */
  readonly reason?: string;
} & (
  | { readonly officialResultId: string }
  | { readonly encounterId: OfficialResult["encounterId"] }
);

export interface VoidOfficialResultDependencies {
  readonly results: OfficialResultRepository;
  readonly selections: OfficialMatchSelectionRepository;
  readonly ids: IdGeneratorPort;
  readonly authorization: AuthorizationPort;
  readonly eventPublisher: EventPublisherPort;
  readonly clock: ClockPort;
}

export class VoidOfficialResultUseCase {
  constructor(private readonly deps: VoidOfficialResultDependencies) {}

  async execute(
    input: VoidOfficialResultInput,
  ): Promise<Result<OfficialResult, VoidOfficialResultError>> {
    const existing =
      "officialResultId" in input
        ? await this.deps.results.findById(input.officialResultId)
        : await this.deps.results.findLatestByEncounter(input.encounterId);
    if (!existing) {
      return err(
        new OfficialResultNotFound({
          code: "results.official_result_not_found",
          message: "Official result was not found",
        }),
      );
    }

    const authorization = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: RESULT_PERMISSION.resultApprove,
      scope: {
        organizationId: existing.organizationId,
        competitionId: existing.competitionId,
        encounterId: existing.encounterId,
      },
    });
    if (!authorization.allowed) {
      return err(
        new OfficialResultForbidden({
          code: "results.official_result_forbidden",
          message: "The actor cannot void this official result",
        }),
      );
    }

    // Void every approved revision for the encounter so an older approval cannot
    // remain live after the latest revision is voided and stats are cleared.
    const approved = (await this.deps.results.listByEncounter(existing.encounterId)).filter(
      (result) => result.status === "approved",
    );
    const selection = await this.deps.selections.findLatestByEncounter(existing.encounterId);
    const closesSelection = selection?.status === "approved";
    if (approved.length === 0 && !closesSelection) {
      return ok(existing);
    }

    const voided: OfficialResult[] = [];
    for (const result of approved) {
      const updated = await this.deps.results.markVoided(result.id);
      if (updated) voided.push(updated);
    }
    const latestVoided =
      voided.length > 0
        ? voided.reduce((latest, result) => (result.revision >= latest.revision ? result : latest))
        : existing;

    // Closing the selection releases its references so the matches can be used again.
    if (selection && closesSelection) {
      const now = this.deps.clock.now();
      const nextVersion = selection.version + 1;
      const committed = await this.deps.selections.commitTransition({
        expectedVersion: selection.version,
        selection: { ...selection, status: "voided", version: nextVersion, updatedAt: now },
        newProposals: [],
        actions: [
          buildAction(
            {
              ids: this.deps.ids,
              clock: this.deps.clock,
              organizationId: selection.organizationId,
              competitionId: selection.competitionId,
              encounterId: selection.encounterId,
              actor: { capacity: "operator", actorId: input.actorId },
              commandKey: null,
              fingerprint: null,
            },
            {
              type: "voided",
              selectionId: selection.id,
              proposalId: selection.currentProposalId,
              fromStatus: "approved",
              toStatus: "voided",
              versionBefore: selection.version,
              versionAfter: nextVersion,
              reason: normalizeReason(input.reason),
              officialResultId: latestVoided.id,
              occurredAt: now,
            },
          ),
        ],
        dispute: null,
        references: { acquire: [], release: "all" },
      });
      if (committed.status === "version_conflict") {
        throw versionConflict(selection.version, committed.currentVersion);
      }
    }

    await this.deps.eventPublisher.publish({
      eventName: "results.official-result-voided",
      occurredAt: this.deps.clock.now().toISOString(),
      payload: {
        encounterId: latestVoided.encounterId,
        organizationId: latestVoided.organizationId,
        competitionId: latestVoided.competitionId,
        voidedBy: input.actorId,
        officialResultId: latestVoided.id,
        revision: latestVoided.revision,
      },
    });
    return ok(latestVoided);
  }
}
