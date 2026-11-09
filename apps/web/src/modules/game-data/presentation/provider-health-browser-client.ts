import {
  providerHealthResponseSchema,
  type GameDataProviderKeyQuery,
  type ProviderHealthResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { err, ok, TaggedError, type Result } from "@futrob/shared-kernel";
import { readBrowserApiError } from "@/shared/infrastructure/http/browser-api-error.ts";

export class ProviderHealthClientError extends TaggedError("ProviderHealthClientError")<{
  code: string;
  message: string;
  requestId?: RequestId;
  status: number;
}> {}

export const providerHealthBrowserClient = {
  async get(
    providerKey: GameDataProviderKeyQuery,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<Result<ProviderHealthResponse, ProviderHealthClientError>> {
    try {
      const response = await fetch(
        `/api/v1/game-data/providers/${encodeURIComponent(providerKey)}/health`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: options.signal,
        },
      );
      const raw: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const error = readBrowserApiError(response, raw, "game_data.client_error");
        return err(
          new ProviderHealthClientError({
            code: error.code,
            message: error.code,
            requestId: error.requestId,
            status: response.status,
          }),
        );
      }

      const body = providerHealthResponseSchema.safeParse(raw);
      if (!body.success) {
        return err(
          new ProviderHealthClientError({
            code: "game_data.client_schema_error",
            message: "Invalid provider health response",
            status: response.status,
          }),
        );
      }
      return ok(body.data);
    } catch (cause) {
      if (options.signal?.aborted) throw cause;
      return err(
        new ProviderHealthClientError({
          code: "game_data.client_network_error",
          message: cause instanceof Error ? cause.message : String(cause),
          status: 0,
        }),
      );
    }
  },
};
