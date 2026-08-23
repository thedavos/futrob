import { TaggedError } from "@futrob/shared-kernel";

export class AuthServiceMisconfiguredError extends TaggedError("AuthServiceMisconfiguredError")<{
  code: "auth.misconfigured";
  message: string;
}> {}

export class AuthServiceUnavailableError extends TaggedError("AuthServiceUnavailableError")<{
  code: "auth.unavailable";
  message: string;
}> {}
