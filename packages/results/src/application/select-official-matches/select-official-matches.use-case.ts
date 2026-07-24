import { err, ok, type Result } from "@futrob/shared-kernel";
import { domainError, type DomainError } from "@futrob/shared-kernel";
import type { ActorId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { EventPublisherPort } from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";

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
  ): Promise<Result<OfficialMatchSelection, DomainError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter) {
      return err(
        domainError("results.encounter_not_found", "Encounter not found", {
          encounterId: input.encounterId,
        }),
      );
    }

    if (input.selections.length !== encounter.officialMatchCount) {
      return err(
        domainError(
          "results.invalid_selection",
          "Selection count must match official match slots",
          {
            expected: encounter.officialMatchCount,
            received: input.selections.length,
          },
        ),
      );
    }

    const refs = input.selections.map((s) => s.providerMatchRef);
    const keys = new Set(refs.map((r) => `${r.providerKey}:${r.externalId}`));
    if (keys.size !== refs.length) {
      return err(
        domainError(
          "results.duplicate_provider_match",
          "The same provider match cannot fill two official slots",
        ),
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
