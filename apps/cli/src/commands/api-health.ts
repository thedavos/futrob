import { Effect } from "effect";
import { apiCall } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

export function run(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const config = { baseUrl: common.baseUrl, actorId: common.actorId };
    const health = yield* apiCall(config, (client) => client.meta.health());

    if (common.json) {
      printJson(health);
    } else {
      print(`API ${health.ok ? "ok" : "error"} · DB ${health.db}`);
    }
    return health.ok ? 0 : 1;
  });
}
