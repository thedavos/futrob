import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export interface ProviderCacheEntry<T> {
  readonly value: T;
  readonly freshUntil: Date;
  readonly staleUntil: Date;
}

export interface ProviderCacheWriteInput<T> {
  readonly key: string;
  readonly providerKey: string;
  readonly operation: string;
  readonly value: T;
  readonly freshUntil: Date;
  readonly staleUntil: Date;
  readonly token: string;
  readonly now: Date;
}

export interface ProviderResponseCache {
  read<T>(key: string): Promise<ProviderCacheEntry<T> | null>;
  tryAcquireRefresh(input: {
    readonly key: string;
    readonly providerKey: string;
    readonly operation: string;
    readonly token: string;
    readonly now: Date;
    readonly leaseExpiresAt: Date;
  }): Promise<boolean>;
  write<T>(input: ProviderCacheWriteInput<T>): Promise<void>;
  release(key: string, token: string): Promise<void>;
}

export class InMemoryProviderResponseCache implements ProviderResponseCache {
  private readonly entries = new Map<string, ProviderCacheEntry<unknown>>();
  private readonly leases = new Map<string, { token: string; expiresAt: Date }>();

  read<T>(key: string): Promise<ProviderCacheEntry<T> | null> {
    return Promise.resolve((this.entries.get(key) as ProviderCacheEntry<T> | undefined) ?? null);
  }

  tryAcquireRefresh(
    input: Parameters<ProviderResponseCache["tryAcquireRefresh"]>[0],
  ): Promise<boolean> {
    const lease = this.leases.get(input.key);
    if (lease && lease.expiresAt > input.now) return Promise.resolve(false);
    this.leases.set(input.key, { token: input.token, expiresAt: input.leaseExpiresAt });
    return Promise.resolve(true);
  }

  write(input: ProviderCacheWriteInput<unknown>): Promise<void> {
    const lease = this.leases.get(input.key);
    if (!lease || lease.token !== input.token) return Promise.resolve();
    this.entries.set(input.key, {
      value: input.value,
      freshUntil: input.freshUntil,
      staleUntil: input.staleUntil,
    });
    this.leases.delete(input.key);
    return Promise.resolve();
  }

  release(key: string, token: string): Promise<void> {
    if (this.leases.get(key)?.token === token) this.leases.delete(key);
    return Promise.resolve();
  }
}

export class PostgresProviderResponseCache implements ProviderResponseCache {
  constructor(private readonly pool: Pool) {}

  async read<T>(key: string): Promise<ProviderCacheEntry<T> | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT value_json, fresh_until, stale_until
       FROM provider_response_cache
       WHERE cache_key = $1 AND value_json IS NOT NULL`,
      [key],
    );
    const row = result.rows[0];
    return row
      ? {
          value: row.value_json as T,
          freshUntil: new Date(row.fresh_until),
          staleUntil: new Date(row.stale_until),
        }
      : null;
  }

  async tryAcquireRefresh(
    input: Parameters<ProviderResponseCache["tryAcquireRefresh"]>[0],
  ): Promise<boolean> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO provider_response_cache (
         cache_key, provider_key, operation, refresh_token, refresh_lease_expires_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (cache_key) DO UPDATE SET
         refresh_token = EXCLUDED.refresh_token,
         refresh_lease_expires_at = EXCLUDED.refresh_lease_expires_at,
         updated_at = EXCLUDED.updated_at
       WHERE provider_response_cache.refresh_token IS NULL
          OR provider_response_cache.refresh_lease_expires_at <= $6
       RETURNING cache_key`,
      [
        input.key,
        input.providerKey,
        input.operation,
        input.token,
        input.leaseExpiresAt.toISOString(),
        input.now.toISOString(),
      ],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async write(input: ProviderCacheWriteInput<unknown>): Promise<void> {
    await getPgExecutor(this.pool).query(
      `UPDATE provider_response_cache
       SET value_json = $3::jsonb, fresh_until = $4, stale_until = $5,
           refresh_token = NULL, refresh_lease_expires_at = NULL, updated_at = $6
       WHERE cache_key = $1 AND refresh_token = $2`,
      [
        input.key,
        input.token,
        JSON.stringify(input.value),
        input.freshUntil.toISOString(),
        input.staleUntil.toISOString(),
        input.now.toISOString(),
      ],
    );
  }

  async release(key: string, token: string): Promise<void> {
    await getPgExecutor(this.pool).query(
      `UPDATE provider_response_cache
       SET refresh_token = NULL, refresh_lease_expires_at = NULL
       WHERE cache_key = $1 AND refresh_token = $2`,
      [key, token],
    );
  }
}
