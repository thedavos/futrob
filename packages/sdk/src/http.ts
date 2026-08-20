import { REQUEST_ID_HEADER, requestIdSchema } from "@futrob/api-contracts";
import { parseApiErrorBody, parseRetryAfterSeconds, FutrobApiError } from "./errors.ts";
import type { HttpResponseBody } from "./wire-body.ts";
import { httpResponseBodySchema } from "./wire-body.ts";

export type { HttpResponseBody } from "./wire-body.ts";

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /** Extra headers merged into every request (e.g. X-Futrob-Actor-Id from BFF). */
  readonly getExtraHeaders?: () =>
    | Record<string, string>
    | undefined
    | Promise<Record<string, string> | undefined>;
  readonly fetchImpl?: typeof fetch;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: HttpClientOptions["getAccessToken"];
  private readonly getExtraHeaders?: HttpClientOptions["getExtraHeaders"];
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.getExtraHeaders = options.getExtraHeaders;
    // Keep a bound/wrapper fetch — bare `fetch` as a method reference throws
    // "Illegal invocation" in browsers when called as `this.fetchImpl(...)`.
    const unbound = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.fetchImpl = (input, init) => unbound(input, init);
  }

  async request<T>(input: {
    readonly path: string;
    readonly method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    readonly body?: unknown;
    readonly requestId?: string;
    readonly parse: (data: HttpResponseBody) => T;
  }): Promise<T> {
    const headerMap = new Map<string, string>([["Accept", "application/json"]]);

    const extra = this.getExtraHeaders ? await this.getExtraHeaders() : undefined;
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        headerMap.set(key, value);
      }
    }

    const token = this.getAccessToken ? await this.getAccessToken() : undefined;
    if (token) {
      headerMap.set("Authorization", `Bearer ${token}`);
    }

    if (input.requestId) {
      headerMap.set(REQUEST_ID_HEADER, input.requestId);
    } else if (!hasRequestIdHeader(headerMap)) {
      headerMap.set(REQUEST_ID_HEADER, crypto.randomUUID());
    }

    let body: string | undefined;
    if (input.body !== undefined) {
      headerMap.set("Content-Type", "application/json");
      body = JSON.stringify(input.body);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${input.path}`, {
      method: input.method,
      headers: Object.fromEntries(headerMap),
      body,
    });

    let raw: HttpResponseBody = null;
    if (response.status !== 204) {
      const parsedBody = httpResponseBodySchema.safeParse(await response.json().catch(() => null));
      raw = parsedBody.success ? parsedBody.data : null;
    }

    if (!response.ok) {
      const responseRequestId = requestIdSchema.safeParse(response.headers.get(REQUEST_ID_HEADER));
      const apiError = parseApiErrorBody(raw);
      if (apiError) {
        throw new FutrobApiError({
          status: response.status,
          body: {
            ...apiError,
            requestId:
              apiError.requestId ??
              (responseRequestId.success ? responseRequestId.data : undefined),
            retryAfterSeconds:
              apiError.retryAfterSeconds ??
              parseRetryAfterSeconds(response.headers.get("Retry-After")),
          },
        });
      }
      throw new FutrobApiError({
        status: response.status,
        body: {
          code: "sdk.http_error",
          messageKey: "errors.http",
          requestId: responseRequestId.success ? responseRequestId.data : undefined,
        },
      });
    }

    return input.parse(raw);
  }
}

function hasRequestIdHeader(headers: Map<string, string>): boolean {
  return [...headers.keys()].some((key) => key.toLowerCase() === REQUEST_ID_HEADER.toLowerCase());
}
