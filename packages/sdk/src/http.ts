import { parseApiErrorBody, FutrobApiError } from "./errors.ts";

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly getAccessToken?: () => string | undefined | Promise<string | undefined>;
  readonly fetchImpl?: typeof fetch;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: HttpClientOptions["getAccessToken"];
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
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

    const raw: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const apiError = parseApiErrorBody(raw);
      if (apiError) {
        throw new FutrobApiError({ status: response.status, body: apiError });
      }
      throw new FutrobApiError({
        status: response.status,
        body: {
          code: "sdk.http_error",
          messageKey: "errors.http",
        },
      });
    }

    return input.parse(raw);
  }
}
