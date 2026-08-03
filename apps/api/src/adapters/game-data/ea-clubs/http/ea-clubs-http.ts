import { err, ok, type Result } from "@futrob/shared-kernel";
import {
  ProviderHttpFailed,
  ProviderNetworkError,
  ProviderTimeout,
  type ProviderTransportError,
} from "@futrob/game-data";

/**
 * EA's edge (Akamai) rejects bare API clients with 403 Access Denied.
 * Browser-like UA + Sec-Fetch-* is enough for the public search endpoints.
 */
export const EA_CLUBS_REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
} as const;

export interface EaClubsHttpClientOptions {
  readonly fetcher: typeof fetch;
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

export class EaClubsHttpClient {
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: EaClubsHttpClientOptions) {
    const unbound = options.fetcher;
    this.fetcher = ((input, init) => unbound(input, init)) as typeof fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs;
  }

  async getJson(
    path: string,
    query: Record<string, string | number | undefined>,
  ): Promise<Result<unknown, ProviderTransportError>> {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(url.toString(), {
        method: "GET",
        headers: { ...EA_CLUBS_REQUEST_HEADERS },
        signal: controller.signal,
      });

      const raw: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        return err(
          new ProviderHttpFailed({
            code: "game_data.ea_clubs_http_error",
            message: "EA Clubs request failed",
            status: response.status,
            path,
            body: raw,
          }),
        );
      }

      return ok(raw);
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === "AbortError";
      const causeText = cause instanceof Error ? cause.message : String(cause);
      return err(
        aborted
          ? new ProviderTimeout({
              code: "game_data.ea_clubs_timeout",
              message: "EA Clubs request timed out",
              path,
              cause: causeText,
            })
          : new ProviderNetworkError({
              code: "game_data.ea_clubs_network_error",
              message: "EA Clubs network error",
              path,
              cause: causeText,
            }),
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
