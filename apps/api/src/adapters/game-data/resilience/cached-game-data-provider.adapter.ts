import { createHash } from "node:crypto";
import { err, ok, type ClockPort, type IdGeneratorPort, type Result } from "@futrob/shared-kernel";
import { externalClubSchema } from "@futrob/api-contracts";
import { z } from "zod";
import {
  ProviderRefreshInProgress,
  isRetryableProviderError,
  type GameDataProviderPort,
  type GetExternalClubInput,
  type GetRecentMatchesInput,
  type IngestedProviderMatches,
  type ProviderError,
  type ProviderMatch,
  type ProviderMatchIngestionPort,
  type SearchExternalClubsInput,
} from "@futrob/game-data";
import type { ProviderResponseCache } from "./provider-response-cache.ts";
import { logCorrelatedInfo } from "@/context/request-correlation.ts";

const REFRESH_LEASE_MS = 45_000;
const FOLLOWER_POLL_MS = 50;

export class CachedGameDataProviderAdapter
  implements GameDataProviderPort, ProviderMatchIngestionPort
{
  readonly key;
  readonly capabilities;

  constructor(
    private readonly provider: GameDataProviderPort & ProviderMatchIngestionPort,
    private readonly deps: {
      readonly cache: ProviderResponseCache;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly sleep: (delayMs: number) => Promise<void>;
      readonly searchTtlMs: number;
      readonly clubTtlMs: number;
      readonly staleMs: number;
    },
  ) {
    this.key = provider.key;
    this.capabilities = provider.capabilities;
  }

  searchClubs(input: SearchExternalClubsInput) {
    return this.loadCached(
      "search-clubs",
      normalizeSearch(input),
      this.deps.searchTtlMs,
      z.array(externalClubSchema),
      () => this.provider.searchClubs(input),
    );
  }

  getClubInfo(input: GetExternalClubInput) {
    return this.loadCached(
      "club-info",
      normalizeClub(input),
      this.deps.clubTtlMs,
      externalClubSchema,
      () => this.provider.getClubInfo(input),
    );
  }

  getRecentMatches(input: GetRecentMatchesInput): Promise<Result<ProviderMatch[], ProviderError>> {
    return this.provider.getRecentMatches(input);
  }

  ingestRecentMatches(
    input: GetRecentMatchesInput,
  ): Promise<Result<IngestedProviderMatches, ProviderError>> {
    return this.provider.ingestRecentMatches(input);
  }

  private async loadCached<T>(
    operation: string,
    normalizedInput: Readonly<Record<string, string>>,
    ttlMs: number,
    schema: z.ZodType<T>,
    load: () => Promise<Result<T, ProviderError>>,
  ): Promise<Result<T, ProviderError>> {
    const key = cacheKey(this.key, operation, normalizedInput);
    const now = this.deps.clock.now();
    let cached = await this.deps.cache.read(key);
    if (cached && cached.freshUntil > now) {
      this.logCache(operation, "cache_hit");
      return ok(schema.parse(cached.value));
    }
    this.logCache(operation, "cache_miss");

    const token = this.deps.ids.generate();
    const acquired = await this.deps.cache.tryAcquireRefresh({
      key,
      providerKey: this.key,
      operation,
      token,
      now,
      leaseExpiresAt: new Date(now.getTime() + REFRESH_LEASE_MS),
    });
    if (!acquired) {
      if (cached && cached.staleUntil > this.deps.clock.now()) {
        this.logCache(operation, "cache_stale");
        return ok(schema.parse(cached.value));
      }
      await this.deps.sleep(FOLLOWER_POLL_MS);
      cached = await this.deps.cache.read(key);
      if (cached && cached.freshUntil > this.deps.clock.now()) {
        this.logCache(operation, "cache_hit");
        return ok(schema.parse(cached.value));
      }
      if (cached && cached.staleUntil > this.deps.clock.now()) {
        this.logCache(operation, "cache_stale");
        return ok(schema.parse(cached.value));
      }
      return err(
        new ProviderRefreshInProgress({
          code: "game_data.provider_refresh_in_progress",
          message: "Provider response refresh is already in progress",
          retryAfterSeconds: 1,
        }),
      );
    }

    try {
      const result = await load();
      if (!result.isOk()) {
        if (cached && cached.staleUntil > now && isRetryableProviderError(result.error)) {
          this.logCache(operation, "cache_stale");
          return ok(schema.parse(cached.value));
        }
        return result;
      }
      const refreshedAt = this.deps.clock.now();
      await this.deps.cache.write({
        key,
        providerKey: this.key,
        operation,
        value: result.value,
        freshUntil: new Date(refreshedAt.getTime() + ttlMs),
        staleUntil: new Date(refreshedAt.getTime() + ttlMs + this.deps.staleMs),
        token,
        now: refreshedAt,
      });
      return result;
    } finally {
      await this.deps.cache.release(key, token);
    }
  }

  private logCache(operation: string, outcome: "cache_hit" | "cache_miss" | "cache_stale"): void {
    logCorrelatedInfo("provider.cache", { provider: this.key, operation, outcome });
  }
}

function cacheKey(
  providerKey: string,
  operation: string,
  input: Readonly<Record<string, string>>,
): string {
  const canonical = Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const digest = createHash("sha256").update(canonical).digest("hex");
  return `provider-cache:v1:${providerKey}:${operation}:${digest}`;
}

function normalizeSearch(input: SearchExternalClubsInput) {
  return {
    edition: input.gameEdition.trim().toLowerCase(),
    platform: input.platform.trim().toLowerCase(),
    query: input.query.trim().toLocaleLowerCase("en-US"),
  };
}

function normalizeClub(input: GetExternalClubInput) {
  return {
    edition: input.gameEdition.trim().toLowerCase(),
    externalClubId: input.externalClubId.trim(),
    platform: input.platform.trim().toLowerCase(),
  };
}
