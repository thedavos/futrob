import { Effect } from "effect";
import { apiCall } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { parseCommon } from "../lib/parse-flags.ts";
import { printJson } from "../lib/print.ts";

export function run(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const config = { baseUrl: common.baseUrl, actorId: common.actorId };
    const status = yield* apiCall(config, (client) => client.identity.getOnboardingStatus());
    printJson(status);
    return 0;
  });
}
