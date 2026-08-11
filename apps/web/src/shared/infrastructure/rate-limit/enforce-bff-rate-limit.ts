import type { RequestId } from "@futrob/api-contracts";
import type { ActorId } from "@futrob/shared-kernel";
import type { AppD1Database } from "../d1.ts";
import { apiErrorResponse } from "../http/api-response.ts";
import {
  parseBffRateLimitPolicies,
  type BffRateLimiter,
  type BffRateLimitPolicy,
  type RateLimitDecision,
} from "./bff-rate-limiter.ts";
import { D1BffRateLimiter } from "./d1-bff-rate-limiter.ts";
import { fingerprintRateLimitSubject } from "./rate-limit-fingerprint.ts";

type RateLimitLogEntry = Readonly<{
  event: "bff.rate_limit.checked";
  environment: string;
  outcome: RateLimitDecision["outcome"];
  policy: BffRateLimitPolicy;
  requestId: RequestId;
  limitedBy?: "actor" | "ip";
  retryAfterSeconds?: number;
}>;

interface RateLimitLogger {
  info(entry: RateLimitLogEntry): void;
}

type RateLimitBindings = Readonly<{
  APP_DB: AppD1Database;
  RATE_LIMIT_FINGERPRINT_SECRET?: string;
  RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS?: string;
  RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX?: string;
  RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX?: string;
  RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS?: string;
  RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX?: string;
  RATE_LIMIT_INVITATION_ACCEPT_IP_MAX?: string;
  ENVIRONMENT?: string;
}>;

type EnforceDependencies = Readonly<{
  limiter?: BffRateLimiter;
  fingerprintSecret?: string;
  environment?: string;
  now?: () => number;
  logger?: RateLimitLogger;
  bindings?: RateLimitBindings;
}>;

const consoleRateLimitLogger: RateLimitLogger = {
  info(entry) {
    console.warn(JSON.stringify(entry));
  },
};

export class BffRateLimitUnavailableError extends Error {
  readonly code = "api.rate_limit_unavailable" as const;

  constructor() {
    super("BFF rate limiter is unavailable");
    this.name = "BffRateLimitUnavailableError";
  }
}

export async function enforceBffRateLimit(
  input: Readonly<{
    request: Request;
    actorId: ActorId;
    requestId: RequestId;
    policy: BffRateLimitPolicy;
  }>,
  dependencies: EnforceDependencies = {},
): Promise<Response | undefined> {
  const connectingIp = input.request.headers.get("CF-Connecting-IP");
  let bindings = dependencies.bindings;
  if (!bindings && (!dependencies.limiter || !dependencies.fingerprintSecret)) {
    bindings = await loadWorkerBindings();
  }
  const fingerprintSecret =
    dependencies.fingerprintSecret ??
    bindings?.RATE_LIMIT_FINGERPRINT_SECRET ??
    process.env.RATE_LIMIT_FINGERPRINT_SECRET;
  if (!connectingIp || !fingerprintSecret) throw new BffRateLimitUnavailableError();

  let limiter = dependencies.limiter;
  if (!limiter) {
    if (!bindings) throw new BffRateLimitUnavailableError();
    try {
      limiter = new D1BffRateLimiter({
        database: bindings.APP_DB,
        fingerprintSecret,
        policies: parseBffRateLimitPolicies({
          RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS:
            bindings.RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS ??
            process.env.RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS,
          RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX:
            bindings.RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX ??
            process.env.RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX,
          RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX:
            bindings.RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX ??
            process.env.RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX,
          RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS:
            bindings.RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS ??
            process.env.RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS,
          RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX:
            bindings.RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX ??
            process.env.RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX,
          RATE_LIMIT_INVITATION_ACCEPT_IP_MAX:
            bindings.RATE_LIMIT_INVITATION_ACCEPT_IP_MAX ??
            process.env.RATE_LIMIT_INVITATION_ACCEPT_IP_MAX,
        }),
      });
    } catch {
      throw new BffRateLimitUnavailableError();
    }
  }

  let decision: RateLimitDecision;
  try {
    decision = await limiter.check({
      policy: input.policy,
      actorId: input.actorId,
      ipFingerprint: await fingerprintRateLimitSubject(fingerprintSecret, "ip", connectingIp),
      nowMs: (dependencies.now ?? Date.now)(),
    });
  } catch {
    throw new BffRateLimitUnavailableError();
  }
  const logger = dependencies.logger ?? consoleRateLimitLogger;
  const environment =
    dependencies.environment ?? bindings?.ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown";

  if (decision.outcome === "allowed") {
    logger.info({
      event: "bff.rate_limit.checked",
      environment,
      outcome: decision.outcome,
      policy: input.policy,
      requestId: input.requestId,
    });
    return undefined;
  }

  logger.info({
    event: "bff.rate_limit.checked",
    environment,
    limitedBy: decision.limitedBy,
    outcome: decision.outcome,
    policy: input.policy,
    requestId: input.requestId,
    retryAfterSeconds: decision.retryAfterSeconds,
  });
  const response = apiErrorResponse(
    429,
    {
      code: "api.rate_limited",
      messageKey: "errors.api.rate_limited",
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    input.requestId,
  );
  response.headers.set("Retry-After", String(decision.retryAfterSeconds));
  return response;
}

async function loadWorkerBindings(): Promise<RateLimitBindings> {
  const { getWorkerEnv } = await import("@/modules/identity/adapters/auth/worker-env.ts");
  return getWorkerEnv();
}
