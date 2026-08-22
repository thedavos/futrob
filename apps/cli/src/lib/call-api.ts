import { Effect } from "effect";
import { FutrobApiError } from "@futrob/sdk";
import { ApiError, NetworkError } from "./errors.ts";
import { createConsoleLogger } from "@futrob/logger";

/** Lifts an SDK promise into an Effect with typed CLI errors. */
export function callApi<A>(
  baseUrl: string,
  task: () => Promise<A>,
): Effect.Effect<A, ApiError | NetworkError> {
  return Effect.tryPromise({
    try: task,
    catch: (error): ApiError | NetworkError => {
      if (error instanceof FutrobApiError) {
        return new ApiError({
          status: error.status,
          code: error.code,
          messageKey: error.messageKey,
          details: error.details,
          baseUrl,
        });
      }
      const logger = createConsoleLogger({ format: "plain", scope: "cli" });
      logger.warn("api.call.network_failed", {
        baseUrl,
        message: error instanceof Error ? error.message : String(error),
      });
      return new NetworkError({
        message: error instanceof Error ? error.message : String(error),
        baseUrl,
      });
    },
  });
}
