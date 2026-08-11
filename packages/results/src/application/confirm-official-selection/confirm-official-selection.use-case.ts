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
} from "@futrob/shared-kernel";
import type {
  OfficialResult,
  OfficialResultSlotSnapshot,
} from "../../domain/entities/official-result.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import {
  OfficialResultForbidden,
  ProviderMatchSnapshotMissing,
  SelectionNotConfirmable,
  SelectionNotFound,
  type ConfirmOfficialSelectionError,
} from "../../domain/errors/official-result.errors.ts";

export interface ConfirmOfficialSelectionInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
}

/**
 * Opponent confirmation (or organizer resolve) that materializes an approved
 * OfficialResult snapshot and emits results.official-result-approved.
 */
export class ConfirmOfficialSelectionUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: OfficialResultRepository;
      readonly providerMatches: ProviderMatchReaderPort;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: ConfirmOfficialSelectionInput,
  ): Promise<Result<OfficialResult, ConfirmOfficialSelectionError>> {
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

    const authorization = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: "encounters.official-selection.resolve",
      scope: {
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
      },
    });
    if (!authorization.allowed) {
      return err(
        new OfficialResultForbidden({
          code: "results.official_result_forbidden",
          message: "The actor cannot confirm this official selection",
        }),
      );
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
    if (
      selection.status !== "awaiting_opponent_confirmation" &&
      selection.status !== "organizer_review"
    ) {
      return err(
        new SelectionNotConfirmable({
          code: "results.selection_not_confirmable",
          message: `Selection status ${selection.status} cannot be confirmed`,
        }),
      );
    }

    const existing = await this.deps.results.findApprovedByEncounter(input.encounterId);
    const revision = (existing?.revision ?? 0) + 1;
    const slots: OfficialResultSlotSnapshot[] = [];

    for (const slot of selection.slots) {
      const match = await this.deps.providerMatches.getByExternalRef(slot.providerMatchRef);
      if (!match) {
        return err(
          new ProviderMatchSnapshotMissing({
            code: "results.provider_match_snapshot_missing",
            message: "Selected provider match is not available for snapshot",
            externalId: slot.providerMatchRef.externalId,
          }),
        );
      }
      slots.push({
        officialSlot: slot.officialSlot,
        providerMatchRef: slot.providerMatchRef,
        homeExternalClubId: match.home.externalClubId,
        awayExternalClubId: match.away.externalClubId,
        homeGoals: match.home.goals,
        awayGoals: match.away.goals,
        occurredAt: match.occurredAt,
        gameEdition: match.game.edition,
        platform: match.game.platform,
        players: match.players,
      });
    }

    const approvedAt = this.deps.clock.now();
    const result: OfficialResult = {
      id: this.deps.ids.generate(),
      encounterId: input.encounterId,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      revision,
      status: "approved",
      slots,
      approvedAt,
      approvedBy: input.actorId,
    };

    const saved = await this.deps.results.save(result);
    await this.deps.selections.save({
      ...selection,
      status: "approved",
    });
    await this.deps.eventPublisher.publish({
      eventName: "results.official-result-approved",
      occurredAt: approvedAt.toISOString(),
      payload: {
        encounterId: input.encounterId,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        approvedBy: input.actorId,
        officialResultId: saved.id,
        revision: saved.revision,
      },
    });
    return ok(saved);
  }
}
