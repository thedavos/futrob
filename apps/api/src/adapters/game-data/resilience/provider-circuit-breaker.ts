export type ProviderCircuitState = "closed" | "open" | "half_open";

export type ProviderCircuitPermission =
  | { readonly allowed: true; readonly state: "closed" | "half_open" }
  | {
      readonly allowed: false;
      readonly state: "open" | "half_open";
      readonly retryAfterMs: number;
    };

export interface ProviderCircuitBreaker {
  beforeRequest(input: {
    readonly key: string;
    readonly now: Date;
    readonly probeLeaseToken: string;
    readonly probeLeaseExpiresAt: Date;
  }): Promise<ProviderCircuitPermission>;
  recordSuccess(input: { readonly key: string; readonly now: Date }): Promise<void>;
  recordTransientFailure(input: {
    readonly key: string;
    readonly now: Date;
    readonly failureThreshold: number;
    readonly cooldownMs: number;
  }): Promise<void>;
}

interface CircuitRecord {
  state: ProviderCircuitState;
  consecutiveFailures: number;
  openedUntil: Date | null;
  probeLeaseToken: string | null;
  probeLeaseExpiresAt: Date | null;
}

export class InMemoryProviderCircuitBreaker implements ProviderCircuitBreaker {
  private readonly records = new Map<string, CircuitRecord>();

  beforeRequest(
    input: Parameters<ProviderCircuitBreaker["beforeRequest"]>[0],
  ): Promise<ProviderCircuitPermission> {
    const record = this.records.get(input.key);
    if (!record || record.state === "closed") {
      return Promise.resolve({ allowed: true, state: "closed" });
    }
    if (record.state === "open" && record.openedUntil && record.openedUntil <= input.now) {
      this.records.set(input.key, {
        ...record,
        state: "half_open",
        probeLeaseToken: input.probeLeaseToken,
        probeLeaseExpiresAt: input.probeLeaseExpiresAt,
      });
      return Promise.resolve({ allowed: true, state: "half_open" });
    }
    if (
      record.state === "half_open" &&
      (!record.probeLeaseExpiresAt || record.probeLeaseExpiresAt <= input.now)
    ) {
      this.records.set(input.key, {
        ...record,
        probeLeaseToken: input.probeLeaseToken,
        probeLeaseExpiresAt: input.probeLeaseExpiresAt,
      });
      return Promise.resolve({ allowed: true, state: "half_open" });
    }
    const retryAt = record.state === "open" ? record.openedUntil : record.probeLeaseExpiresAt;
    return Promise.resolve({
      allowed: false,
      state: record.state,
      retryAfterMs: Math.max(0, (retryAt?.getTime() ?? input.now.getTime()) - input.now.getTime()),
    });
  }

  recordSuccess(input: Parameters<ProviderCircuitBreaker["recordSuccess"]>[0]): Promise<void> {
    this.records.set(input.key, {
      state: "closed",
      consecutiveFailures: 0,
      openedUntil: null,
      probeLeaseToken: null,
      probeLeaseExpiresAt: null,
    });
    return Promise.resolve();
  }

  recordTransientFailure(
    input: Parameters<ProviderCircuitBreaker["recordTransientFailure"]>[0],
  ): Promise<void> {
    const current = this.records.get(input.key);
    const failures = (current?.consecutiveFailures ?? 0) + 1;
    const shouldOpen = current?.state === "half_open" || failures >= input.failureThreshold;
    this.records.set(input.key, {
      state: shouldOpen ? "open" : "closed",
      consecutiveFailures: failures,
      openedUntil: shouldOpen ? new Date(input.now.getTime() + input.cooldownMs) : null,
      probeLeaseToken: null,
      probeLeaseExpiresAt: null,
    });
    return Promise.resolve();
  }
}
