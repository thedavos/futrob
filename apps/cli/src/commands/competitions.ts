import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
  discoverableCompetitionStatusSchema,
} from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- comp-create <orgId> <name> [--edition fc27] [--platform playstation] [--region america] [--tz UTC] [--format league]
  npm run cli -- comp-list <orgId>
  npm run cli -- comp-show <orgId> <compId>
  npm run cli -- comp-publish <orgId> <compId>
  npm run cli -- comp-registration-open <orgId> <compId>
  npm run cli -- comp-registration-close <orgId> <compId>
  npm run cli -- participant-add <orgId> <compId> <teamId>
  npm run cli -- participant-list <orgId> <compId>
  npm run cli -- entry-register <orgId> <compId> <teamId>
  npm run cli -- entry-approve <orgId> <compId> <entryId>
  npm run cli -- entry-reject <orgId> <compId> <entryId>
  npm run cli -- standings <orgId> <compId>
  npm run cli -- comp-explore [--q name] [--format league] [--status published] [--region america] [--platform playstation]
  npm run cli -- comp-explore-show <competitionId>
  npm run cli -- comp-apply <competitionId> <teamName> [--key creationKey]
  npm run cli -- comp-application <competitionId>`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function compCreate(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, name] = yield* requirePositionals(common.positionals, 2, USAGE);
    const input = {
      name,
      gameEdition: flagString(common.flags, "edition") ?? "fc27",
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

export function compRegistrationOpen(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const opened = yield* apiCall(configOf(common), (client) =>
      client.competitions.openRegistration(organizationId, competitionId),
    );
    if (common.json) {
      printJson(opened);
    } else {
      print(`Inscripciones abiertas: ${competitionId}`);
    }
    return 0;
  });
}

export function compRegistrationClose(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const closed = yield* apiCall(configOf(common), (client) =>
      client.competitions.closeRegistration(organizationId, competitionId),
    );
    if (common.json) {
      printJson(closed);
    } else {
      print(`Inscripciones cerradas (borrador): ${competitionId}`);
    }
    return 0;
  });
}

export function compExplore(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const q = flagString(common.flags, "q");
    const format = flagString(common.flags, "format");
    const status = flagString(common.flags, "status");
    const region = flagString(common.flags, "region");
    const platform = flagString(common.flags, "platform");
    const result = yield* apiCall(configOf(common), (client) =>
      client.competitions.explore({
        q,
        format: format ? competitionFormatSchema.parse(format) : undefined,
        status: status ? discoverableCompetitionStatusSchema.parse(status) : undefined,
        region: region ? competitionRegionSchema.parse(region) : undefined,
        platform: platform ? competitionPlatformSchema.parse(platform) : undefined,
      }),
    );
    if (common.json) {
      printJson(result);
      return 0;
    }
    print(`${result.total} competiciones`);
    for (const item of result.items) {
      print(
        `${item.competition.id}\t${item.competition.name}\t${item.organization.name}\t${item.competition.status}\t${item.approvedTeamCount}`,
      );
    }
    return 0;
  });
}

export function compExploreShow(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [competitionId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const item = yield* apiCall(configOf(common), (client) =>
      client.competitions.getExplore(competitionId),
    );
    if (common.json) {
      printJson(item);
      return 0;
    }
    print(
      `${item.competition.id}\t${item.competition.name}\t${item.organization.name}\t${item.competition.status}`,
    );
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

export function compApply(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [competitionId, teamName] = yield* requirePositionals(common.positionals, 2, USAGE);
    const creationKey = flagString(common.flags, "key") ?? `cli-apply-${randomUUID()}`;
    const application = yield* apiCall(configOf(common), (client) =>
      client.competitions.apply(competitionId, { teamName, creationKey }),
    );
    if (common.json) {
      printJson(application);
    } else {
      print(`${application.entryId}\t${application.teamName}\t${application.status}`);
    }
    return 0;
  });
}

export function compApplication(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [competitionId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const { application } = yield* apiCall(configOf(common), (client) =>
      client.competitions.getMyApplication(competitionId),
    );
    if (common.json) {
      printJson({ application });
    } else {
      print(
        application
          ? `${application.entryId}\t${application.teamName}\t${application.status}`
          : "Sin solicitud en esta competición",
      );
    }
    return 0;
  });
}
