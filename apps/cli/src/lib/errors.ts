import { Data } from "effect";

export class ApiError extends Data.TaggedError("ApiError")<{
  readonly status: number;
  readonly code: string;
  readonly messageKey: string;
  readonly details?: unknown;
  readonly baseUrl: string;
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly baseUrl: string;
}> {}

export class UsageError extends Data.TaggedError("UsageError")<{
  readonly message: string;
  readonly usage?: string;
}> {}

export type CliError = ApiError | NetworkError | UsageError;
