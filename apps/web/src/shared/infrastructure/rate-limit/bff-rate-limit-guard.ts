import type { RequestId } from "@futrob/api-contracts";
import type { ActorId } from "@futrob/shared-kernel";
import type { BffRateLimitPolicy } from "./bff-rate-limiter.ts";

type AuthenticatedBffContext = Readonly<{
  actorId: ActorId;
  requestId: RequestId;
}>;

type EnforceRateLimit = (
  input: Readonly<{
    request: Request;
    actorId: ActorId;
    requestId: RequestId;
    policy: BffRateLimitPolicy;
  }>,
) => Promise<Response | undefined>;

export async function runRateLimitedBffRequest<TContext extends AuthenticatedBffContext>(input: {
  readonly request: Request;
  readonly policy: BffRateLimitPolicy;
  readonly authenticate: () => Promise<TContext>;
  readonly enforce: EnforceRateLimit;
  readonly next: (context: TContext) => Promise<Response>;
}): Promise<Response> {
  const authenticated = await input.authenticate();
  const rejection = await input.enforce({
    request: input.request,
    actorId: authenticated.actorId,
    requestId: authenticated.requestId,
    policy: input.policy,
  });
  if (rejection) return rejection;
  return input.next(authenticated);
}
