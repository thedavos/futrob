import { Effect } from "effect";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
} from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- comp-create <orgId> <name> [--edition fc26] [--platform playstation] [--region america] [--tz UTC] [--format league]
  npm run cli -- comp-list <orgId>
  npm run cli -- comp-show <orgId> <compId>
  npm run cli -- comp-publish <orgId> <compId>
  npm run cli -- participant-add <orgId> <compId> <teamId>
  npm run cli -- participant-list <orgId> <compId>
  npm run cli -- entry-register <orgId> <compId> <teamId>
  npm run cli -- entry-approve <orgId> <compId> <entryId>
  npm run cli -- entry-reject <orgId> <compId> <entryId>
  npm run cli -- standings <orgId> <compId>`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function compCreate(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, name] = yield* requirePositionals(common.positionals, 2, USAGE);
    const input = {
      name,
      gameEdition: flagString(common.flags, "edition") ?? "fc26",
      platform: competitionPlatformSchema.parse(
        flagString(common.flags, "platform") ?? "playstation",
      ),
      region: competitionRegionSchema.parse(flagString(common.flags, "region") ?? "america"),
      timeZone: flagString(common.flags, "tz") ?? "UTC",
      format: competitionFormatSchema.parse(flagString(common.flags, "format") ?? "league"),
    };
    const draft = yield* apiCall(configOf(common), (client) =>
      client.competitions.createDraft(organizationId, input),
    );
    if (common.json) {
      printJson(draft);
    } else {
      print(`Draft creado: ${JSON.stringify(draft, null, 2)}`);
    }
    return 0;
  });
}

export function compList(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.competitions.list(organizationId),
    );
    if (common.json) {
      printJson(result);
      return 0;
    }
    for (const competition of result.competitions) {
      print(`${competition.id}\t${competition.name}\t${competition.status}`);
    }
    return 0;
  });
}

export function compShow(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const draft = yield* apiCall(configOf(common), (client) =>
      client.competitions.getDraft(organizationId, competitionId),
    );
    printJson(draft);
    return 0;
  });
}

export function compPublish(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const published = yield* apiCall(configOf(common), (client) =>
      client.competitions.publish(organizationId, competitionId),
    );
    if (common.json) {
      printJson(published);
    } else {
      print(`Competición publicada: ${competitionId}`);
    }
    return 0;
  });
}

export function participantAdd(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, teamId] = yield* requirePositionals(
      common.positionals,
      3,
      USAGE,
    );
    const result = yield* apiCall(configOf(common), (client) =>
      client.competitions.addParticipant(organizationId, competitionId, {
        kind: "existing-team",
        teamId,
      }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Participante agregado: ${teamId}`);
    }
    return 0;
  });
}

export function participantList(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.competitions.listParticipants(organizationId, competitionId),
    );
    if (common.json) {
      printJson(result);
      return 0;
    }
    for (const participant of result.participants) {
      print(JSON.stringify(participant));
    }
    return 0;
  });
}

export function entryRegister(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, teamId] = yield* requirePositionals(
      common.positionals,
      3,
      USAGE,
    );
    const creationKey = flagString(common.flags, "creation-key");
    const result = yield* apiCall(configOf(common), (client) =>
      client.competitions.registerTeamEntry(organizationId, competitionId, {
        teamId,
        creationKey,
      }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Entry registrado: ${JSON.stringify(result, null, 2)}`);
    }
    return 0;
  });
}

export function entryApprove(raw: string[]): Effect.Effect<number, CliError> {
  return decideEntry(raw, "approve");
}

export function entryReject(raw: string[]): Effect.Effect<number, CliError> {
  return decideEntry(raw, "reject");
}

function decideEntry(
  raw: string[],
  decision: "approve" | "reject",
): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, entryId] = yield* requirePositionals(
      common.positionals,
      3,
      USAGE,
    );
    const result = yield* apiCall(configOf(common), (client) =>
      decision === "approve"
        ? client.competitions.approveTeamEntry(organizationId, competitionId, entryId)
        : client.competitions.rejectTeamEntry(organizationId, competitionId, entryId),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Entry ${decision === "approve" ? "aprobado" : "rechazado"}: ${entryId}`);
    }
    return 0;
  });
}

export function standings(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.statistics.getCompetitionStandings({ organizationId, competitionId }),
    );
    if (common.json) {
      printJson(result);
      return 0;
    }
    if (!result.standings) {
      print("Sin standings aún.");
      return 0;
    }
    for (const row of result.standings.rows) {
      print(
        `${row.position}\t${row.teamId}\tPJ:${row.played} G:${row.wins} E:${row.draws} P:${row.losses} GF:${row.goalsFor} GC:${row.goalsAgainst} PTS:${row.points}`,
      );
    }
    return 0;
  });
}
