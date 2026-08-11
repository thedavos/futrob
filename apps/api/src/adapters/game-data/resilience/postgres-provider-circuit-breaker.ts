import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import type {
  ProviderCircuitBreaker,
  ProviderCircuitPermission,
  ProviderCircuitState,
} from "./provider-circuit-breaker.ts";

export class PostgresProviderCircuitBreaker implements ProviderCircuitBreaker {
  constructor(private readonly pool: Pool) {}

  async getProviderState(providerKey: string, now: Date): Promise<ProviderCircuitState> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT state, opened_until
       FROM provider_circuit_state
       WHERE circuit_key LIKE $1 ESCAPE '\\'`,
      [`${escapeLike(providerKey)}:%`],
    );
    const states = result.rows.map((row) => {
      if (
        row.state === "open" &&
        row.opened_until &&
        new Date(row.opened_until).getTime() <= now.getTime()
      ) {
        return "half_open";
      }
      return row.state as ProviderCircuitState;
    });
    if (states.includes("open")) return "open";
    if (states.includes("half_open")) return "half_open";
    return "closed";
  }

  async beforeRequest(
    input: Parameters<ProviderCircuitBreaker["beforeRequest"]>[0],
  ): Promise<ProviderCircuitPermission> {
    const executor = getPgExecutor(this.pool);
    await executor.query(
      `INSERT INTO provider_circuit_state (
         circuit_key, state, consecutive_failures, updated_at
       ) VALUES ($1, 'closed', 0, $2)
       ON CONFLICT (circuit_key) DO NOTHING`,
      [input.key, input.now.toISOString()],
    );
    const probe = await executor.query(
      `UPDATE provider_circuit_state
       SET state = 'half_open', probe_lease_token = $3,
           probe_lease_expires_at = $4, updated_at = $2
       WHERE circuit_key = $1 AND (
         (state = 'open' AND opened_until <= $2)
         OR (state = 'half_open' AND probe_lease_expires_at <= $2)
       )
       RETURNING state`,
      [
        input.key,
        input.now.toISOString(),
        input.probeLeaseToken,
        input.probeLeaseExpiresAt.toISOString(),
      ],
    );
    if (probe.rows[0]) {
      return {
        allowed: true,
        state: "half_open",
        probeLeaseToken: input.probeLeaseToken,
      };
    }

    const result = await executor.query(
      `SELECT state, opened_until, probe_lease_expires_at
       FROM provider_circuit_state WHERE circuit_key = $1`,
      [input.key],
    );
    const row = result.rows[0] as {
      state: ProviderCircuitState;
      opened_until: Date | string | null;
      probe_lease_expires_at: Date | string | null;
    };
    if (row.state === "closed") return { allowed: true, state: "closed" };
    const retryAt = row.state === "open" ? row.opened_until : row.probe_lease_expires_at;
    return {
      allowed: false,
      state: row.state,
      retryAfterMs: Math.max(
        0,
        (retryAt ? new Date(retryAt).getTime() : input.now.getTime()) - input.now.getTime(),
      ),
    };
  }

  async recordSuccess(
    input: Parameters<ProviderCircuitBreaker["recordSuccess"]>[0],
  ): Promise<void> {
    if (input.probeLeaseToken) {
      await getPgExecutor(this.pool).query(
        `UPDATE provider_circuit_state
         SET state = 'closed', consecutive_failures = 0, opened_until = NULL,
             probe_lease_token = NULL, probe_lease_expires_at = NULL, updated_at = $2
         WHERE circuit_key = $1 AND state = 'half_open' AND probe_lease_token = $3`,
        [input.key, input.now.toISOString(), input.probeLeaseToken],
      );
      return;
    }
    await getPgExecutor(this.pool).query(
      `INSERT INTO provider_circuit_state (
         circuit_key, state, consecutive_failures, updated_at
       ) VALUES ($1, 'closed', 0, $2)
       ON CONFLICT (circuit_key) DO UPDATE SET
         state = 'closed', consecutive_failures = 0, opened_until = NULL,
         probe_lease_token = NULL, probe_lease_expires_at = NULL, updated_at = $2
       WHERE provider_circuit_state.state = 'closed'`,
      [input.key, input.now.toISOString()],
    );
  }

  async recordTransientFailure(
    input: Parameters<ProviderCircuitBreaker["recordTransientFailure"]>[0],
  ): Promise<void> {
    if (input.probeLeaseToken) {
      await getPgExecutor(this.pool).query(
        `UPDATE provider_circuit_state
         SET state = 'open', consecutive_failures = consecutive_failures + 1,
             opened_until = $3, probe_lease_token = NULL,
             probe_lease_expires_at = NULL, updated_at = $2
         WHERE circuit_key = $1 AND state = 'half_open' AND probe_lease_token = $4`,
        [
          input.key,
          input.now.toISOString(),
          new Date(input.now.getTime() + input.cooldownMs).toISOString(),
          input.probeLeaseToken,
        ],
      );
      return;
    }
    await getPgExecutor(this.pool).query(
      `INSERT INTO provider_circuit_state (
         circuit_key, state, consecutive_failures, opened_until, updated_at
       ) VALUES (
         $1,
         CASE WHEN $3 <= 1 THEN 'open' ELSE 'closed' END,
         1,
         CASE WHEN $3 <= 1 THEN $4 ELSE NULL END,
         $2
       )
       ON CONFLICT (circuit_key) DO UPDATE SET
         consecutive_failures = provider_circuit_state.consecutive_failures + 1,
         state = CASE
           WHEN provider_circuit_state.state = 'half_open'
             OR provider_circuit_state.consecutive_failures + 1 >= $3
           THEN 'open' ELSE 'closed' END,
         opened_until = CASE
           WHEN provider_circuit_state.state = 'half_open'
             OR provider_circuit_state.consecutive_failures + 1 >= $3
           THEN $4 ELSE NULL END,
         probe_lease_token = NULL,
         probe_lease_expires_at = NULL,
         updated_at = $2
       WHERE provider_circuit_state.state = 'closed'`,
      [
        input.key,
        input.now.toISOString(),
        input.failureThreshold,
        new Date(input.now.getTime() + input.cooldownMs).toISOString(),
      ],
    );
  }
}

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}
