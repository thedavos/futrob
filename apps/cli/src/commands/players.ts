import { Effect } from "effect";
import { apiCall } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

export function playerMe(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const config = { baseUrl: common.baseUrl, actorId: common.actorId };
    const profile = yield* apiCall(config, (client) => client.teams.getMyProfile());
    printJson(profile);
    return 0;
  });
}

function filtersOf(raw: string[]) {
  const common = parseCommon(raw);
  const flags = common.flags;
  return {
    common,
    query: {
      competitionId: flagString(flags, "competition"),
      teamId: flagString(flags, "team"),
      gameEdition: flagString(flags, "edition"),
      platform: flagString(flags, "platform"),
    },
  };
}

export function myStats(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const { common, query } = filtersOf(raw);
    const config = { baseUrl: common.baseUrl, actorId: common.actorId };
    const stats = yield* apiCall(config, (client) => client.statistics.getMyStatistics(query));
    if (common.json) {
      printJson(stats);
      return 0;
    }
    if (stats === null) {
      print("Sin estadísticas para el actor.");
      return 0;
    }
    print(JSON.stringify(stats, null, 2));
    return 0;
  });
}

export function myMatches(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const config = { baseUrl: common.baseUrl, actorId: common.actorId };
    const result = yield* apiCall(config, (client) => client.statistics.getMyMatches());
    if (common.json) {
      printJson(result);
      return 0;
    }
    for (const match of result.matches) {
      print(JSON.stringify(match));
    }
    return 0;
  });
}
