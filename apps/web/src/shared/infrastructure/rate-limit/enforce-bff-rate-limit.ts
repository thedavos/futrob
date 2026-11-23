import type { RequestId } from "@futrob/api-contracts";
import type { ActorId } from "@futrob/shared-kernel";
import { createServiceProductApiClient } from "@/context/product-api-client.ts";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { apiErrorResponse } from "../http/api-response.ts";
import {
  productApiRateLimiter,
  type BffRateLimiter,
  type BffRateLimitPolicy,
  type RateLimitDecision,
} from "./bff-rate-limiter.ts";

export type RateLimitLogEntry = Readonly<{
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
  ENVIRONMENT?: string;
  INTERNAL_JOB_SECRET?: string;
  FUTROB_API_BASE_URL?: string;
}>;

type EnforceDependencies = Readonly<{
  limiter?: BffRateLimiter;
  environment?: string;
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

export function shouldBypassBffRateLimit(environment: string): boolean {
  return environment === "development";
}

/**
 * Counts the attempt in the product API (ADR-0034) and returns the 429 response when it
 * is over the limit. Fails closed: without the client IP or an answer from the API the
 * request is refused with `BffRateLimitUnavailableError`.
 */
export async function enforceBffRateLimit(
  input: Readonly<{
    request: Request;
    /** `null` for a signed-out request, limited by IP alone. */
    actorId: ActorId | null;
    requestId: RequestId;
    policy: BffRateLimitPolicy;
  }>,
  dependencies: EnforceDependencies = {},
): Promise<Response | undefined> {
  const earlyEnvironment = dependencies.environment ?? process.env.NODE_ENV;
  if (earlyEnvironment && shouldBypassBffRateLimit(earlyEnvironment)) return undefined;

  let bindings = dependencies.bindings;
  if (!bindings && !dependencies.limiter) bindings = await getWorkerBindings();
  const environment =
    dependencies.environment ?? bindings?.ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown";
  if (shouldBypassBffRateLimit(environment)) return undefined;

  const clientIp = input.request.headers.get("CF-Connecting-IP");
  if (!clientIp) throw new BffRateLimitUnavailableError();
  const limiter = dependencies.limiter ?? defaultLimiter(bindings, input.requestId);

  let decision: RateLimitDecision;
  try {
    decision = await limiter.check({ policy: input.policy, actorId: input.actorId, clientIp });
  } catch {
    throw new BffRateLimitUnavailableError();
  }
  const logger = dependencies.logger ?? consoleRateLimitLogger;

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

function defaultLimiter(
  bindings: RateLimitBindings | undefined,
  requestId: RequestId,
): BffRateLimiter {
  const internalJobSecret = bindings?.INTERNAL_JOB_SECRET ?? process.env.INTERNAL_JOB_SECRET;
  if (!internalJobSecret) throw new BffRateLimitUnavailableError();
  return productApiRateLimiter(
    createServiceProductApiClient({
      internalJobSecret,
      requestId,
      baseUrl: bindings?.FUTROB_API_BASE_URL,
    }),
  );
}
