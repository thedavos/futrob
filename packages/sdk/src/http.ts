import { REQUEST_ID_HEADER, requestIdSchema } from "@futrob/api-contracts";
import { parseApiErrorBody, parseRetryAfterSeconds, FutrobApiError } from "./errors.ts";

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
    this.fetchImpl = ((input, init) => unbound(input, init)) as typeof fetch;
  }

  async request<T>(input: {
    readonly path: string;
    readonly method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    readonly body?: unknown;
    readonly parse: (data: unknown) => T;
  }): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const extra = this.getExtraHeaders ? await this.getExtraHeaders() : undefined;
    if (extra) {
      Object.assign(headers, extra);
    }

    const token = this.getAccessToken ? await this.getAccessToken() : undefined;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body: string | undefined;
    if (input.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(input.body);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${input.path}`, {
      method: input.method,
      headers,
      body,
    });

    const raw: unknown = response.status === 204 ? null : await response.json().catch(() => null);

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
