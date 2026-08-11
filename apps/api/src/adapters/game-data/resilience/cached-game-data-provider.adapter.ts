import { createHash } from "node:crypto";
import { err, ok, type ClockPort, type IdGeneratorPort, type Result } from "@futrob/shared-kernel";
import {
  ProviderUnavailable,
  isRetryableProviderError,
  type GameDataProviderPort,
  type GetExternalClubInput,
  type GetRecentMatchesInput,
  type IngestedProviderMatches,
  type ProviderError,
  type ProviderHealthOutcome,
  type ProviderHealthPort,
  type ProviderMatch,
  type ProviderMatchIngestionPort,
  type SearchExternalClubsInput,
} from "@futrob/game-data";
import type { ProviderCacheEntry, ProviderResponseCache } from "./provider-response-cache.ts";
import {
  currentRequestCorrelation,
  currentJobCorrelation,
  logCorrelatedError,
  logCorrelatedInfo,
} from "@/context/request-correlation.ts";

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
      readonly health?: ProviderHealthPort;
    },
  ) {
    this.key = provider.key;
    this.capabilities = provider.capabilities;
  }

  searchClubs(input: SearchExternalClubsInput) {
    return this.loadCached("search-clubs", normalizeSearch(input), this.deps.searchTtlMs, () =>
      this.provider.searchClubs(input),
    );
  }

  getClubInfo(input: GetExternalClubInput) {
    return this.loadCached("club-info", normalizeClub(input), this.deps.clubTtlMs, () =>
      this.provider.getClubInfo(input),
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
    load: () => Promise<Result<T, ProviderError>>,
  ): Promise<Result<T, ProviderError>> {
    const key = cacheKey(this.key, operation, normalizedInput);
    const now = this.deps.clock.now();
    let cached = await this.deps.cache.read<T>(key);
    if (cached && cached.freshUntil > now) {
      await this.recordCache(operation, "cache_hit");
      return cachedResult(cached);
    }
    await this.recordCache(operation, "cache_miss");

    const token = this.deps.ids.generate();
    const acquired = await this.deps.cache.tryAcquireRefresh({
      key,
      providerKey: this.key,
      operation,
      token,
      now,
      leaseExpiresAt: new Date(now.getTime() + 10_000),
    });
    if (!acquired) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await this.deps.sleep(10);
        cached = await this.deps.cache.read<T>(key);
        if (cached && cached.freshUntil > this.deps.clock.now()) {
          await this.recordCache(operation, "cache_hit");
          return cachedResult(cached);
        }
      }
      if (cached && cached.staleUntil > this.deps.clock.now()) {
        await this.recordCache(operation, "cache_stale");
        return cachedResult(cached);
      }
      return err(
        new ProviderUnavailable({
          code: "game_data.provider_unavailable",
          message: "Provider response refresh is already in progress",
          retryAfterSeconds: 1,
        }),
      );
    }

    try {
      const result = await load();
      if (!result.isOk()) {
        if (cached && cached.staleUntil > now && isRetryableProviderError(result.error)) {
          await this.recordCache(operation, "cache_stale");
          return cachedResult(cached);
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

  private async recordCache(
    operation: string,
    outcome: Extract<ProviderHealthOutcome, "cache_hit" | "cache_miss" | "cache_stale">,
  ): Promise<void> {
    logCorrelatedInfo("provider.cache", { provider: this.key, operation, outcome });
    if (!this.deps.health) return;
    try {
      await this.deps.health.record({
        id: this.deps.ids.generate(),
        providerKey: this.key,
        operation,
        outcome,
        latencyMs: 0,
        occurredAt: this.deps.clock.now(),
        requestId: currentRequestCorrelation()?.requestId ?? null,
        jobId: currentJobCorrelation() ?? null,
      });
    } catch {
      logCorrelatedError("provider.health.record_failed", { provider: this.key, operation });
    }
  }
}

function cachedResult<T>(entry: ProviderCacheEntry<T>): Result<T, never> {
  return ok(entry.value);
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
