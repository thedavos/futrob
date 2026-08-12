import { createHash, randomUUID } from "node:crypto";
import { err, ok, type Result } from "@futrob/shared-kernel";
import {
  ExternalClubNotFound,
  ProviderSchemaError,
  providerHealthOutcome,
  type ExternalClub,
  type GameDataProviderPort,
  type GetExternalClubInput,
  type GetRecentMatchesInput,
  type IngestedProviderMatches,
  type ProviderMatch,
  type ProviderMatchIngestionPort,
  type ProviderError,
  type ProviderHealthOutcome,
  type ProviderHealthPort,
  type SearchExternalClubsInput,
} from "@futrob/game-data";
import { EaClubsHttpClient } from "./http/ea-clubs-http.ts";
import type { ProviderCircuitBreaker } from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";
import {
  currentJobCorrelation,
  currentRequestCorrelation,
  logCorrelatedError,
} from "@/context/request-correlation.ts";
import {
  eaClubInfoMapSchema,
  eaClubMatchesResponseSchema,
  eaSearchClubsResponseSchema,
} from "./schemas/ea-clubs.schemas.ts";
import {
  mapClubInfoToExternalClub,
  mapClubMatchToProviderMatch,
  mapLeaderboardEntryToExternalClub,
} from "./mappers/ea-clubs.mappers.ts";

const MATCH_ENDPOINT = "/clubs/matches";
const MATCH_SCHEMA_VERSION = "ea-clubs.match.v1";

export class EaClubsGameDataAdapter implements GameDataProviderPort, ProviderMatchIngestionPort {
  readonly key = "ea-clubs" as const;

  readonly capabilities = {
    searchClubs: true,
    getClubInfo: true,
    getRecentMatches: true,
    getPlayerStats: true,
    getTeamStats: true,
  } as const;

  private readonly http: EaClubsHttpClient;

  constructor(
    private readonly deps: {
      readonly fetcher: typeof fetch;
      readonly baseUrl: string;
      readonly timeoutMs: number;
      readonly circuit?: ProviderCircuitBreaker;
      readonly clock?: { now(): Date };
      readonly health?: ProviderHealthPort;
    },
  ) {
    this.http = new EaClubsHttpClient({
      fetcher: deps.fetcher,
      baseUrl: deps.baseUrl,
      timeoutMs: deps.timeoutMs,
      circuit: deps.circuit,
      clock: deps.clock,
    });
  }

  searchClubs(input: SearchExternalClubsInput): Promise<Result<ExternalClub[], ProviderError>> {
    return this.withHealth("/allTimeLeaderboard/search", async () => {
      const response = await this.http.getJson("/allTimeLeaderboard/search", {
        platform: input.platform,
        clubName: input.query,
      });
      if (!response.isOk()) return err(response.error);

      const parsed = eaSearchClubsResponseSchema.safeParse(response.value);
      if (!parsed.success) {
        return err(
          new ProviderSchemaError({
            code: "game_data.ea_clubs_schema_error",
            message: "Failed to parse EA search response",
            issues: parsed.error.issues,
          }),
        );
      }

      const clubs = parsed.data
        .map((entry) =>
          mapLeaderboardEntryToExternalClub(entry, {
            platform: input.platform,
            gameEdition: input.gameEdition,
          }),
        )
        .filter((club): club is ExternalClub => club !== null);

      return ok(clubs);
    });
  }

  getClubInfo(input: GetExternalClubInput): Promise<Result<ExternalClub, ProviderError>> {
    return this.withHealth("/clubs/info", async () => {
      const response = await this.http.getJson("/clubs/info", {
        platform: input.platform,
        clubIds: input.externalClubId,
      });
      if (!response.isOk()) return err(response.error);

      const parsed = eaClubInfoMapSchema.safeParse(response.value);
      if (!parsed.success) {
        return err(
          new ProviderSchemaError({
            code: "game_data.ea_clubs_schema_error",
            message: "Failed to parse EA club info response",
            issues: parsed.error.issues,
          }),
        );
      }

      const info = parsed.data[input.externalClubId];
      if (!info) {
        return err(
          new ExternalClubNotFound({
            code: "game_data.external_club_not_found",
            message: "Club not found on EA Clubs",
            externalClubId: input.externalClubId,
          }),
        );
      }

      return ok(
        mapClubInfoToExternalClub(info, {
          platform: input.platform,
          gameEdition: input.gameEdition,
        }),
      );
    });
  }

  async getRecentMatches(
    input: GetRecentMatchesInput,
  ): Promise<Result<ProviderMatch[], ProviderError>> {
    const ingested = await this.ingestRecentMatches(input);
    if (!ingested.isOk()) return err(ingested.error);
    return ok([...ingested.value.matches]);
  }

  ingestRecentMatches(
    input: GetRecentMatchesInput,
  ): Promise<Result<IngestedProviderMatches, ProviderError>> {
    return this.withHealth(MATCH_ENDPOINT, async () => {
      const response = await this.http.getJson(MATCH_ENDPOINT, {
        platform: input.platform,
        clubIds: input.externalClubId,
        matchType: input.matchType,
        maxResultCount: input.maxResultCount,
      });
      if (!response.isOk()) return err(response.error);

      const parsed = eaClubMatchesResponseSchema.safeParse(response.value);
      if (!parsed.success) {
        return err(
          new ProviderSchemaError({
            code: "game_data.ea_clubs_schema_error",
            message: "Failed to parse EA matches response",
            issues: parsed.error.issues,
          }),
        );
      }

      const rawPayloads = Array.isArray(response.value) ? response.value : [];
      const observedAt = new Date();
      const observations = parsed.data.map((match, index) => {
        const payload = rawPayloads[index];
        return {
          providerKey: this.key,
          resourceType: "match" as const,
          externalResourceId: match.matchId,
          endpointKey: MATCH_ENDPOINT,
          payloadHash: hashPayload(payload),
          storageRef: "inline",
          payload,
          observedAt,
          httpStatus: 200,
          schemaVersion: MATCH_SCHEMA_VERSION,
        };
      });

      const matches = parsed.data
        .map((match) =>
          mapClubMatchToProviderMatch(match, {
            platform: input.platform,
            gameEdition: input.gameEdition,
            matchType: input.matchType,
            focalExternalClubId: input.externalClubId,
          }),
        )
        .filter((match): match is ProviderMatch => match !== null);

      return ok({ observations, matches });
    });
  }

  private async withHealth<T>(
    operation: string,
    run: () => Promise<Result<T, ProviderError>>,
  ): Promise<Result<T, ProviderError>> {
    const startedAt = performance.now();
    const result = await run();
    if (result.isOk() || ExternalClubNotFound.is(result.error)) {
      this.recordHealth(operation, "success", startedAt);
      return result;
    }
    const outcome = providerHealthOutcome(result.error);
    if (outcome) this.recordHealth(operation, outcome, startedAt);
    return result;
  }

  private recordHealth(operation: string, outcome: ProviderHealthOutcome, startedAt: number): void {
    if (!this.deps.health) return;
    const write = this.deps.health.record({
      id: randomUUID(),
      providerKey: this.key,
      operation,
      outcome,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      occurredAt: this.deps.clock?.now() ?? new Date(),
      requestId: currentRequestCorrelation()?.requestId ?? null,
      jobId: currentJobCorrelation() ?? null,
    });
    void write.catch(() => {
      logCorrelatedError("provider.health.record_failed", { provider: this.key, operation });
    });
  }
}

function hashPayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  if (json === undefined) {
    throw new TypeError("EA match payload is not JSON serializable");
  }
  return createHash("sha256").update(json).digest("hex");
}
