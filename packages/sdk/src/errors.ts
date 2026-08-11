import { apiErrorSchema, type ApiErrorBody } from "@futrob/api-contracts";

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

export function parseApiErrorBody(data: unknown): ApiErrorBody | null {
  const parsed = apiErrorSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
