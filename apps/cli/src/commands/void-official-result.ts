import { Effect } from "effect";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { printJson } from "../lib/print.ts";

export function run(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [id] = yield* requirePositionals(
      common.positionals,
      1,
      "result-void <officialResultId> [--reason <text>] [--actor <id>]",
    );
    const result = yield* apiCall({ baseUrl: common.baseUrl, actorId: common.actorId }, (client) =>
      client.results.voidOfficialResult(id!, { reason: flagString(common.flags, "reason") }),
    );
    printJson(result);
    return 0;
  });
}
