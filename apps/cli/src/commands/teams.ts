import { Effect } from "effect";
import { rosterMembershipRoleSchema } from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import { UsageError } from "../lib/errors.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- team-create <orgId> <name>
  npm run cli -- team-list <orgId>
  npm run cli -- roster-list <orgId> <compId> <teamId>
  npm run cli -- roster-add <orgId> <compId> <teamId> <playerProfileId> [--role captain|player]
  npm run cli -- roster-close <orgId> <compId> <teamId>
  npm run cli -- roster-open <orgId> <compId> <teamId>
  npm run cli -- club-link <orgId> <compId> <teamId> <externalClubId> <externalClubName> [--provider ea-clubs] [--platform playstation] [--edition fc26]`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function teamCreate(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, name] = yield* requirePositionals(common.positionals, 2, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.teams.createTeam(organizationId, { name }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Equipo creado: ${JSON.stringify(result, null, 2)}`);
    }
    return 0;
  });
}

export function teamList(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.teams.listByOrganization(organizationId),
    );
    if (common.json) {
      printJson(result);
      return 0;
    }
    for (const team of result.teams) {
      print(`${team.id}\t${team.name}`);
    }
    return 0;
  });
}

function rosterArgs(raw: string[]) {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, teamId] = yield* requirePositionals(
      common.positionals,
      3,
      USAGE,
    );
    return { common, organizationId, competitionId, teamId };
  });
}

export function rosterList(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const args = yield* rosterArgs(raw);
    const config = configOf(args.common);
    const result = yield* apiCall(config, (client) =>
      client.teams.listRoster(args.organizationId, args.competitionId, args.teamId),
    );
    if (args.common.json) {
      printJson(result);
      return 0;
    }
    for (const membership of result.memberships) {
      print(JSON.stringify(membership));
    }
    return 0;
  });
}

export function rosterAdd(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, teamId, playerProfileId] = yield* requirePositionals(
      common.positionals,
      4,
      USAGE,
    );
    const role = rosterMembershipRoleSchema.parse(flagString(common.flags, "role") ?? "player");
    const result = yield* apiCall(configOf(common), (client) =>
      client.teams.addToRoster(organizationId, competitionId, teamId, {
        playerProfileId,
        role,
      }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Jugador agregado al roster: ${playerProfileId}`);
    }
    return 0;
  });
}

export function rosterClose(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const args = yield* rosterArgs(raw);
    const config = configOf(args.common);
    const result = yield* apiCall(config, (client) =>
      client.teams.closeRoster(args.organizationId, args.competitionId, args.teamId),
    );
    if (args.common.json) {
      printJson(result);
    } else {
      print("Roster cerrado");
    }
    return 0;
  });
}

export function rosterOpen(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const args = yield* rosterArgs(raw);
    const config = configOf(args.common);
    const result = yield* apiCall(config, (client) =>
      client.teams.openRoster(args.organizationId, args.competitionId, args.teamId),
    );
    if (args.common.json) {
      printJson(result);
    } else {
      print("Roster abierto");
    }
    return 0;
  });
}

const PROVIDER_KEYS = ["ea-clubs", "manual", "screenshot-ocr"] as const;

export function clubLink(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, teamId, externalClubId, externalClubName] =
      yield* requirePositionals(common.positionals, 5, USAGE);

    const providerKeyRaw = flagString(common.flags, "provider") ?? "ea-clubs";
    const providerKey = PROVIDER_KEYS.find((key) => key === providerKeyRaw);
    if (providerKey === undefined) {
      return yield* new UsageError({
        message: `provider inválido: ${providerKeyRaw}. Usa ${PROVIDER_KEYS.join(" | ")}.`,
        usage: USAGE,
      });
    }

    const input = {
      providerKey,
      externalClubId,
      externalClubName,
      platform: flagString(common.flags, "platform") ?? "playstation",
      gameEdition: flagString(common.flags, "edition") ?? "fc26",
    };
    const result = yield* apiCall(configOf(common), (client) =>
      client.teams.connectExternalClub(organizationId, competitionId, teamId, input),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Club externo vinculado a ${teamId}: ${externalClubName}`);
    }
    return 0;
  });
}
