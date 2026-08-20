import { apiErrorSchema, type ApiErrorBody } from "@futrob/api-contracts";
import type { HttpResponseBody } from "./wire-body.ts";

export class FutrobApiError extends Error {
  readonly code: string;
  readonly messageKey: string;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
  readonly details?: ApiErrorBody["details"];
  readonly status: number;

  constructor(input: { readonly status: number; readonly body: ApiErrorBody }) {
    super(input.body.messageKey);
    this.name = "FutrobApiError";
    this.status = input.status;
    this.code = input.body.code;
    this.messageKey = input.body.messageKey;
    this.requestId = input.body.requestId;
    this.retryAfterSeconds = input.body.retryAfterSeconds;
    this.details = input.body.details;
  }
}

export function parseApiErrorBody(data: HttpResponseBody): ApiErrorBody | null {
  const parsed = apiErrorSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function parseRetryAfterSeconds(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined;
}
