import {
  err,
  ok,
  type IdGeneratorPort,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type { RawProviderObservation } from "../../domain/entities/raw-provider-observation.ts";
import type { ProviderError } from "../../domain/errors/provider.errors.ts";
import { ProviderNotImplemented } from "../../domain/errors/provider.errors.ts";
import type { ProviderMatchIngestionRegistryPort } from "../../domain/ports/provider-match-ingestion-registry.port.ts";
import type { ProviderMatchRepository } from "../../domain/ports/provider-match.repository.ts";
import type { RawObservationRepository } from "../../domain/ports/raw-observation.repository.ts";
import type { GetRecentMatchesInput } from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export class SyncRecentProviderMatchesUseCase {
  constructor(
    private readonly deps: {
      readonly ingestions: ProviderMatchIngestionRegistryPort;
      readonly rawObservations: RawObservationRepository;
      readonly matches: ProviderMatchRepository;
      readonly ids: IdGeneratorPort;
      readonly transaction: TransactionPort;
    },
  ) {}

  async execute(
    providerKey: GameDataProviderKey,
    input: GetRecentMatchesInput,
  ): Promise<Result<readonly ProviderMatch[], ProviderError>> {
    const ingestion = this.deps.ingestions.get(providerKey);
    if (!ingestion) {
      return err(
        new ProviderNotImplemented({
          code: "game_data.provider_not_implemented",
          message: `No ingestion adapter for provider ${providerKey}`,
        }),
      );
    }

    const ingested = await ingestion.ingestRecentMatches(input);
    if (!ingested.isOk()) {
      return err(ingested.error);
    }

    await this.deps.transaction.runInTransaction(async () => {
      for (const draft of ingested.value.observations) {
        const observation: RawProviderObservation = {
          id: this.deps.ids.generate(),
          providerKey: draft.providerKey,
          resourceType: draft.resourceType,
          externalResourceId: draft.externalResourceId,
          endpointKey: draft.endpointKey,
          payloadHash: draft.payloadHash,
          storageRef: draft.storageRef,
          payload: draft.payload,
          observedAt: draft.observedAt,
          httpStatus: draft.httpStatus,
          schemaVersion: draft.schemaVersion,
        };
        await this.deps.rawObservations.append(observation);
      }

      await this.deps.matches.upsertMany(ingested.value.matches);
    });
    return ok(ingested.value.matches);
  }
}
