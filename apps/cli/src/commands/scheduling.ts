import { Effect } from "effect";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import { UsageError } from "../lib/errors.ts";
import type { CliError } from "../lib/errors.ts";
import { flagBoolean, flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- fixture-generate <orgId> <compId> [--starts-at ISO] [--interval-days 7] [--home-and-away]
  npm run cli -- fixture-show <orgId> <compId> <fixturePlanId>
  npm run cli -- snapshot-set <encounterId> <orgId> <compId> <homeTeamId> <awayTeamId> <startISO> [--slots 1|2]`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function fixtureGenerate(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const input = {
      generationVersion: 1,
      startsAt: flagString(common.flags, "starts-at") ?? new Date().toISOString(),
      roundIntervalDays: Number(flagString(common.flags, "interval-days") ?? 7),
      homeAndAway: flagBoolean(common.flags, "home-and-away"),
    };
    const plan = yield* apiCall(configOf(common), (client) =>
      client.encounters.generateFixture(organizationId, competitionId, input),
    );
    if (common.json) {
      printJson(plan);
      return 0;
    }
    for (const stage of plan.stages) {
      for (const round of stage.rounds) {
        for (const encounter of round.encounters) {
          const home = encounter.home.kind === "team" ? encounter.home.teamId : "bye";
          const away = encounter.away.kind === "team" ? encounter.away.teamId : "bye";
          print(`${encounter.id}\tround=${encounter.roundId}\t${home} vs ${away}`);
        }
      }
    }
    print(`fixturePlanId: ${plan.id}`);
    return 0;
  });
}

export function fixtureShow(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, fixturePlanId] = yield* requirePositionals(
      common.positionals,
      3,
      USAGE,
    );
    const plan = yield* apiCall(configOf(common), (client) =>
      client.encounters.getFixture(organizationId, competitionId, fixturePlanId),
    );
    printJson(plan);
    return 0;
  });
}

function parseSlots(value: string | undefined): 1 | 2 | undefined {
  if (value === "1") return 1;
  if (value === "2") return 2;
  return undefined;
}

export function snapshotSet(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [encounterId, organizationId, competitionId, homeTeamId, awayTeamId, scheduledStartAt] =
      yield* requirePositionals(common.positionals, 6, USAGE);

    const officialMatchCount = parseSlots(flagString(common.flags, "slots"));
    if (scheduledStartAt && Number.isNaN(Date.parse(scheduledStartAt))) {
      return yield* new UsageError({
        message: `Fecha inválida: ${scheduledStartAt}`,
        usage: USAGE,
      });
    }

    const config = configOf(common);
    const existing = yield* apiCall(config, (client) =>
      client.encounters.getScheduleSnapshot(encounterId),
    ).pipe(Effect.orElseSucceed(() => null));

    const input = {
      organizationId,
      competitionId,
      homeTeamId,
      awayTeamId,
      scheduledStartAt: scheduledStartAt || existing?.scheduledStartAt || new Date().toISOString(),
      officialMatchCount: officialMatchCount ?? existing?.officialMatchCount ?? 2,
    };

    const snapshot = yield* apiCall(config, (client) =>
      client.encounters.upsertScheduleSnapshot(encounterId, input),
    );
    if (common.json) {
      printJson(snapshot);
    } else {
      print(`Snapshot actualizado para ${encounterId}`);
    }
    return 0;
  });
}
