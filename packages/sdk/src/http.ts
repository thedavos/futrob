import { REQUEST_ID_HEADER, requestIdSchema } from "@futrob/api-contracts";
import {
  FutrobApiError,
  FutrobRequestTimeoutError,
  parseApiErrorBody,
  parseRetryAfterSeconds,
} from "./errors.ts";
import type { HttpResponseBody } from "./wire-body.ts";
import { httpResponseBodySchema } from "./wire-body.ts";

export type { HttpResponseBody } from "./wire-body.ts";

/** Per-request overrides layered on top of the client configuration. */
export interface RequestOptions {
  /** Aborts in-flight attempts. Aborted requests are never retried. */
  readonly signal?: AbortSignal;
  /** Per-attempt timeout in milliseconds. Overrides `HttpClientOptions.timeoutMs`. */
  readonly timeoutMs?: number;
  /**
   * Retry budget. The client default only retries idempotent verbs
   * (GET/PUT/DELETE); an explicit per-request value opts any verb in.
   */
  readonly maxRetries?: number;
  /** Extra headers merged above the client-level extras for this request. */
  readonly headers?: Record<string, string>;
}

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /** Extra headers merged into every request (e.g. X-Futrob-Actor-Id from BFF). */
  readonly getExtraHeaders?: () =>
    | Record<string, string>
    | undefined
    | Promise<Record<string, string> | undefined>;
  readonly fetchImpl?: typeof fetch;
  /** Default per-attempt timeout for every request. Disabled when omitted. */
  readonly timeoutMs?: number;
  /** Default retry budget for idempotent verbs (GET/PUT/DELETE). Disabled when omitted. */
  readonly maxRetries?: number;
}

export interface HttpRequestInput<T> {
  readonly path: string;
  readonly method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  readonly body?: unknown;
  readonly requestId?: string;
  readonly options?: RequestOptions;
  readonly parse: (data: HttpResponseBody) => T;
}

interface AttemptSignals {
  readonly signal: AbortSignal | undefined;
  /** Milliseconds of the timeout that fired, or null while still pending. */
  readonly timedOutAfterMs: () => number | null;
  readonly dispose: () => void;
}

const NON_IDEMPOTENT_METHODS = new Set(["POST", "PATCH"]);
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 15_000;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: HttpClientOptions["getAccessToken"];
  private readonly getExtraHeaders?: HttpClientOptions["getExtraHeaders"];
  private readonly fetchImpl: typeof fetch;
  private readonly defaultTimeoutMs: number | undefined;
  private readonly defaultMaxRetries: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.getExtraHeaders = options.getExtraHeaders;
    // Keep a bound/wrapper fetch — bare `fetch` as a method reference throws
    // "Illegal invocation" in browsers when called as `this.fetchImpl(...)`.
    const unbound = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.fetchImpl = (input, init) => unbound(input, init);
    this.defaultTimeoutMs = options.timeoutMs;
    this.defaultMaxRetries = normalizeRetryBudget(options.maxRetries);
  }

  async request<T>(input: HttpRequestInput<T>): Promise<T> {
    const options = input.options ?? {};
    const url = `${this.baseUrl}${input.path}`;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const maxAttempts = this.resolveMaxAttempts(input.method, options);

    for (let attempt = 1; ; attempt += 1) {
      const attemptSignals = composeAttemptSignals(options.signal, timeoutMs);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: input.method,
          headers: await this.buildHeaders(input, options),
          body: input.body === undefined ? undefined : JSON.stringify(input.body),
          signal: attemptSignals.signal,
        });
      } catch (error) {
        attemptSignals.dispose();
        if (options.signal?.aborted) throw error;
        const timedOutAfterMs = attemptSignals.timedOutAfterMs();
        if (timedOutAfterMs !== null) throw new FutrobRequestTimeoutError(timedOutAfterMs);
        if (attempt < maxAttempts) {
          await delayWithSignal(nextRetryDelayMs(null, attempt), options.signal);
          continue;
        }
        throw error;
      }

      let raw: HttpResponseBody = null;
      if (response.status !== 204) {
        const parsedBody = httpResponseBodySchema.safeParse(
          await response.json().catch(() => null),
        );
        raw = parsedBody.success ? parsedBody.data : null;
      }

      if (!response.ok) {
        attemptSignals.dispose();
        if (isRetryableStatus(response.status) && attempt < maxAttempts) {
          const retryAfterRaw = response.headers.get("Retry-After");
          await delayWithSignal(nextRetryDelayMs(retryAfterRaw, attempt), options.signal);
          continue;
        }
        throw this.toApiError(response, raw);
      }

      attemptSignals.dispose();
      return input.parse(raw);
    }
  }

  private async buildHeaders<T>(
    input: HttpRequestInput<T>,
    options: RequestOptions,
  ): Promise<Record<string, string>> {
    const headerMap = new Map<string, string>([["Accept", "application/json"]]);

    const extra = this.getExtraHeaders ? await this.getExtraHeaders() : undefined;
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        headerMap.set(key, value);
      }
    }
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
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

    if (input.body !== undefined) {
      headerMap.set("Content-Type", "application/json");
    }

    return Object.fromEntries(headerMap);
  }

  private resolveMaxAttempts(
    method: HttpRequestInput<unknown>["method"],
    options: RequestOptions,
  ): number {
    const explicit = options.maxRetries;
    const budget = normalizeRetryBudget(explicit ?? this.defaultMaxRetries);
    if (budget === 0) return 1;
    // Client-level budgets only cover idempotent verbs; an explicit per-request
    // budget opts the caller's specific endpoint in regardless of verb.
    const eligible = explicit !== undefined || !NON_IDEMPOTENT_METHODS.has(method);
    return eligible ? budget + 1 : 1;
  }

  private toApiError(response: Response, raw: HttpResponseBody): FutrobApiError {
    const responseRequestId = requestIdSchema.safeParse(response.headers.get(REQUEST_ID_HEADER));
    const apiError = parseApiErrorBody(raw);
    if (apiError) {
      return new FutrobApiError({
        status: response.status,
        body: {
          ...apiError,
          requestId:
            apiError.requestId ?? (responseRequestId.success ? responseRequestId.data : undefined),
          retryAfterSeconds:
            apiError.retryAfterSeconds ??
            parseRetryAfterSeconds(response.headers.get("Retry-After")),
        },
      });
    }
    return new FutrobApiError({
      status: response.status,
      body: {
        code: "sdk.http_error",
        messageKey: "errors.http",
        requestId: responseRequestId.success ? responseRequestId.data : undefined,
      },
    });
  }
}

function normalizeRetryBudget(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function nextRetryDelayMs(retryAfterRaw: string | null, attempt: number): number {
  const seconds = parseRetryAfterSeconds(retryAfterRaw);
  if (seconds !== undefined) return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  const backoff = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
  return backoff + Math.random() * BASE_RETRY_DELAY_MS;
}

function createAbortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

/**
 * Combines the caller's signal and the per-attempt timeout without
 * `AbortSignal.any`, which is unavailable on some runtimes (e.g. Hermes).
 */
function composeAttemptSignals(
  userSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): AttemptSignals {
  if (userSignal === undefined && timeoutMs === undefined) {
    return { signal: undefined, timedOutAfterMs: () => null, dispose: () => {} };
  }

  const controller = new AbortController();
  let timeoutUsed: number | null = null;

  const forwardAbort = () => controller.abort(userSignal?.reason);
  if (userSignal) {
    if (userSignal.aborted) forwardAbort();
    else userSignal.addEventListener("abort", forwardAbort);
  }

  const timer =
    timeoutMs === undefined
      ? undefined
      : setTimeout(() => {
          timeoutUsed = timeoutMs;
          controller.abort(new FutrobRequestTimeoutError(timeoutMs));
        }, timeoutMs);

  return {
    signal: controller.signal,
    timedOutAfterMs: () => timeoutUsed,
    dispose() {
      if (timer !== undefined) clearTimeout(timer);
      userSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}

function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort);
    }
  });
}

function hasRequestIdHeader(headers: Map<string, string>): boolean {
  return [...headers.keys()].some((key) => key.toLowerCase() === REQUEST_ID_HEADER.toLowerCase());
}
