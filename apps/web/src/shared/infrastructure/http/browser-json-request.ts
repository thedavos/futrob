import type { RequestId } from "@futrob/api-contracts";
import type { z } from "zod";
import {
  readBrowserApiError,
  type BrowserApiError,
} from "@/shared/infrastructure/http/browser-api-error.ts";

export async function requestBrowserJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "PATCH" | "POST" | "PUT" | "DELETE";
  readonly body?: unknown;
  readonly schema: z.ZodType<T>;
  readonly fallbackCode: string;
  readonly createError: (
    status: number,
    apiError: BrowserApiError,
  ) => Error & {
    readonly status: number;
    readonly code: string;
    readonly requestId?: RequestId;
    readonly retryAfterSeconds?: number;
  };
}): Promise<T> {
  const response = await fetch(input.path, {
    method: input.method,
    credentials: "include",
    headers:
      input.body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readBrowserApiError(response, raw, input.fallbackCode);
    throw input.createError(response.status, error);
  }
  return input.schema.parse(raw);
}
