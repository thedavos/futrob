export type ProviderCircuitState = "closed" | "open" | "half_open";

export type ProviderCircuitPermission =
  | { readonly allowed: true; readonly state: "closed" }
  | { readonly allowed: true; readonly state: "half_open"; readonly probeLeaseToken: string }
  | {
      readonly allowed: false;
      readonly state: "open" | "half_open";
      readonly retryAfterMs: number;
    };

export interface ProviderCircuitBreaker {
  getProviderState(providerKey: string, now: Date): Promise<ProviderCircuitState>;
  beforeRequest(input: {
    readonly key: string;
    readonly now: Date;
    readonly probeLeaseToken: string;
    readonly probeLeaseExpiresAt: Date;
  }): Promise<ProviderCircuitPermission>;
  recordSuccess(input: {
    readonly key: string;
    readonly now: Date;
    readonly probeLeaseToken?: string;
  }): Promise<void>;
  recordTransientFailure(input: {
    readonly key: string;
    readonly now: Date;
    readonly failureThreshold: number;
    readonly cooldownMs: number;
    readonly probeLeaseToken?: string;
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

  getProviderState(providerKey: string, now: Date): Promise<ProviderCircuitState> {
    const states = [...this.records.entries()]
      .filter(([key]) => key.startsWith(`${providerKey}:`))
      .map(([, record]) => currentState(record, now));
    if (states.includes("open")) return Promise.resolve("open");
    if (states.includes("half_open")) return Promise.resolve("half_open");
    return Promise.resolve("closed");
  }

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
      return Promise.resolve({
        allowed: true,
        state: "half_open",
        probeLeaseToken: input.probeLeaseToken,
      });
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
      return Promise.resolve({
        allowed: true,
        state: "half_open",
        probeLeaseToken: input.probeLeaseToken,
      });
    }
    const retryAt = record.state === "open" ? record.openedUntil : record.probeLeaseExpiresAt;
    return Promise.resolve({
      allowed: false,
      state: record.state,
      retryAfterMs: Math.max(0, (retryAt?.getTime() ?? input.now.getTime()) - input.now.getTime()),
    });
  }

  recordSuccess(input: Parameters<ProviderCircuitBreaker["recordSuccess"]>[0]): Promise<void> {
    const current = this.records.get(input.key);
    if (input.probeLeaseToken) {
      if (current?.state !== "half_open" || current.probeLeaseToken !== input.probeLeaseToken) {
        return Promise.resolve();
      }
    } else if (current && current.state !== "closed") {
      return Promise.resolve();
    }
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
    if (input.probeLeaseToken) {
      if (current?.state !== "half_open" || current.probeLeaseToken !== input.probeLeaseToken) {
        return Promise.resolve();
      }
    } else if (current && current.state !== "closed") {
      return Promise.resolve();
    }
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

function currentState(record: CircuitRecord, now: Date): ProviderCircuitState {
  if (record.state === "open" && record.openedUntil && record.openedUntil <= now) {
    return "half_open";
  }
  return record.state;
}
