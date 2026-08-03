import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ActorId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { EventPublisherPort } from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import {
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
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

/**
 * Stub use case — validates slot cardinality against encounter snapshot.
 * Persistence and confirmation flow land in a later iteration.
 */
export class SelectOfficialMatchesUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly eventPublisher: EventPublisherPort;
    },
  ) {}

  async execute(
    input: SelectOfficialMatchesInput,
  ): Promise<Result<OfficialMatchSelection, SelectOfficialMatchesError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter) {
      return err(
        new EncounterNotFound({
          code: "results.encounter_not_found",
          message: "Encounter not found",
          encounterId: input.encounterId,
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
      id: "pending",
      encounterId: input.encounterId,
      status: "awaiting_opponent_confirmation",
      slots: input.selections,
      proposedByActorId: input.actorId,
      proposedAt: new Date(),
    };

    void this.deps.eventPublisher;
    return ok(selection);
  }
}
