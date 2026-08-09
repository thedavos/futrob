import {
  err,
  ok,
  type AuthorizationPort,
  type AuthorizationRequest,
  type Result,
} from "@futrob/shared-kernel";
import {
  AuthorizationForbidden,
  AuthorizationScopeNotFound,
} from "../../domain/errors/authorization.errors.ts";

export class RequirePermissionUseCase {
  constructor(private readonly authorization: AuthorizationPort) {}

  async execute(
    input: AuthorizationRequest,
  ): Promise<Result<void, AuthorizationForbidden | AuthorizationScopeNotFound>> {
    const decision = await this.authorization.decide(input);
    if (decision.allowed) return ok(undefined);
    if (decision.reason === "scope-not-found" || decision.reason === "scope-mismatch") {
      return err(
        new AuthorizationScopeNotFound({
          code: "authorization.scope_not_found",
          message: "Authorization scope was not found",
        }),
      );
    }
    return err(
      new AuthorizationForbidden({
        code: "authorization.forbidden",
        message: "The actor does not have the required permission",
        permission: input.permission,
      }),
    );
  }
}
