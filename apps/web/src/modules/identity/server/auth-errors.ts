import { TaggedError } from "@futrob/shared-kernel";

export class AuthServiceMisconfiguredError extends TaggedError("AuthServiceMisconfiguredError")<{
  code: "auth.misconfigured";
  message: string;
}> {}

export class AuthServiceUnavailableError extends TaggedError("AuthServiceUnavailableError")<{
  code: "auth.unavailable";
  message: string;
}> {}

export class AuthUnauthenticatedError extends Error {
  readonly code = "auth.unauthenticated" as const;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthUnauthenticatedError";
  }
}
