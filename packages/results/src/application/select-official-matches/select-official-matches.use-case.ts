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
import type { ExternalReference } from "@futrob/game-data";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { OfficialMatchSelectionRepository } from "../../domain/ports/official-result.repository.ts";
import {
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
  OfficialSelectionForbidden,
  type SelectOfficialMatchesError,
} from "../../domain/errors/select-official-matches.errors.ts";

export interface SelectOfficialMatchesInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly selections: ReadonlyArray<{
    readonly officialSlot: 1 | 2;
    readonly providerMatchRef: ExternalReference;
  }>;
}

export class SelectOfficialMatchesUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: SelectOfficialMatchesInput,
  ): Promise<Result<OfficialMatchSelection, SelectOfficialMatchesError>> {
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

    const authorization = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: "encounters.official-selection.propose",
      scope: {
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
      },
    });
    if (!authorization.allowed) {
      return err(
        new OfficialSelectionForbidden({
          code: "results.official_selection_forbidden",
          message: "The actor cannot propose an official selection for this encounter",
        }),
      );
    }

    if (input.selections.length !== encounter.officialMatchCount) {
      return err(
        new InvalidSelection({
          code: "results.invalid_selection",
          message: "Selection count must match official match slots",
          expected: encounter.officialMatchCount,
          received: input.selections.length,
        }),
      );
    }

    const refs = input.selections.map((s) => s.providerMatchRef);
    const keys = new Set(refs.map((r) => `${r.providerKey}:${r.externalId}`));
    if (keys.size !== refs.length) {
      return err(
        new DuplicateProviderMatch({
          code: "results.duplicate_provider_match",
          message: "The same provider match cannot fill two official slots",
        }),
      );
    }

    const selection: OfficialMatchSelection = {
      id: this.deps.ids.generate(),
      encounterId: input.encounterId,
      status: "awaiting_opponent_confirmation",
      slots: input.selections,
      proposedByActorId: input.actorId,
      proposedAt: this.deps.clock.now(),
    };

    const saved = await this.deps.selections.save(selection);
    await this.deps.eventPublisher.publish({
      eventName: "results.official-matches-selected",
      occurredAt: this.deps.clock.now().toISOString(),
      payload: {
        encounterId: input.encounterId,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        selectionId: saved.id,
      },
    });
    return ok(saved);
  }
}
