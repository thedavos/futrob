import { Effect } from "effect";
import { apiCall, type ClientConfig } from "../lib/futrob-client.ts";
import { UsageError, type CliError } from "../lib/errors.ts";
import { parseCommon } from "../lib/parse-flags.ts";
import { printJson } from "../lib/print.ts";

const ACCOUNT_DELETION_USAGE = `Uso:
  npm run cli -- account-deletion-status
  FUTROB_ACCOUNT_PASSWORD=… npm run cli -- account-deletion-request
  npm run cli -- account-deletion-cancel`;

function configOf(raw: string[]): ClientConfig {
  const common = parseCommon(raw);
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

/** `GET /identity/account/deletion`: state, date and blockers of the actor's account. */
export function accountDeletionStatus(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    printJson(yield* apiCall(configOf(raw), (client) => client.identity.getAccountDeletion()));
    return 0;
  });
}

/**
 * `POST /identity/account/deletion`. The password comes from `FUTROB_ACCOUNT_PASSWORD` so it
 * stays out of shell history and process listings.
 */
export function accountDeletionRequest(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const password = process.env.FUTROB_ACCOUNT_PASSWORD;
    if (!password) {
      return yield* Effect.fail(
        new UsageError({
          message: "Define FUTROB_ACCOUNT_PASSWORD con la contraseña de la cuenta.",
          usage: ACCOUNT_DELETION_USAGE,
        }),
      );
    }
    printJson(
      yield* apiCall(configOf(raw), (client) =>
        client.identity.requestAccountDeletion({ password }),
      ),
    );
    return 0;
  });
}

/** `DELETE /identity/account/deletion`: cancels during the grace period. */
export function accountDeletionCancel(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    printJson(yield* apiCall(configOf(raw), (client) => client.identity.cancelAccountDeletion()));
    return 0;
  });
}
