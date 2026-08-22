import { Effect } from "effect";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import { UsageError } from "../lib/errors.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- club-get <externalClubId>
  npm run cli -- club-matches <externalClubId>
  npm run cli -- sync-job-enqueue <orgId> <externalClubId> [--platform playstation] [--edition fc26] [--match-type club_match] [--max 10]
  npm run cli -- sync-job-run <jobId>
  npm run cli -- sync-job-run-next
  npm run cli -- provider-health [providerKey=ea-clubs]`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function clubGet(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [externalClubId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const club = yield* apiCall(configOf(common), (client) =>
      client.gameData.clubs.retrieve(externalClubId),
    );
    if (common.json) {
      printJson(club);
      return 0;
    }
    print(`${club.externalClubId}\t${club.name}\t${club.platform}\t${club.gameEdition}`);
    return 0;
  });
}

export function clubMatches(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [externalClubId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.gameData.clubs.matches(externalClubId),
    );
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

export function syncJobEnqueue(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, externalClubId] = yield* requirePositionals(
      common.positionals,
      2,
      USAGE,
    );
    const input = {
      organizationId,
      providerKey: "ea-clubs" as const,
      externalClubId,
      platform: flagString(common.flags, "platform") ?? "playstation",
      gameEdition: flagString(common.flags, "edition") ?? "fc26",
      matchType: flagString(common.flags, "match-type") ?? "club_match",
      maxResultCount: Number(flagString(common.flags, "max") ?? 10),
    };
    const job = yield* apiCall(configOf(common), (client) =>
      client.gameData.syncJobs.enqueue(input),
    );
    if (common.json) {
      printJson(job);
    } else {
      print(`Job encolado: ${job.id} (status=${job.status}, attempt=${job.attempt})`);
    }
    return 0;
  });
}

export function syncJobRun(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [jobId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const job = yield* apiCall(configOf(common), (client) => client.gameData.syncJobs.run(jobId));
    if (common.json) {
      printJson(job);
    } else {
      print(`Job ${job.id}: status=${job.status} attempt=${job.attempt}/${job.maxAttempts}`);
    }
    return 0;
  });
}

export function syncJobRunNext(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const job = yield* apiCall(configOf(common), (client) => client.gameData.syncJobs.runNext());
    if (job === null) {
      print("No hay jobs en cola (204).");
      return 0;
    }
    if (common.json) {
      printJson(job);
    } else {
      print(`Job ${job.id}: status=${job.status} attempt=${job.attempt}/${job.maxAttempts}`);
    }
    return 0;
  });
}

const PROVIDER_KEYS = ["ea-clubs", "manual", "screenshot-ocr"] as const;

export function providerHealth(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [providerKeyRaw = "ea-clubs"] = common.positionals;
    const providerKey = PROVIDER_KEYS.find((key) => key === providerKeyRaw);
    if (providerKey === undefined) {
      return yield* new UsageError({
        message: `provider-key inválido: ${providerKeyRaw}. Usa ${PROVIDER_KEYS.join(" | ")}.`,
        usage: USAGE,
      });
    }
    const health = yield* apiCall(configOf(common), (client) =>
      client.gameData.providers.health(providerKey),
    );
    if (common.json) {
      printJson(health);
      return 0;
    }
    print(
      `${health.providerKey}: status=${health.status} circuit=${health.circuitState} ` +
        `samples=${health.sampleSize} ok=${health.successCount} fail=${health.failureCount}`,
    );
    return 0;
  });
}
