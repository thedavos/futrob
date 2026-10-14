import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { UsageError } from "../lib/errors.ts";
import { flagBoolean, flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- comp-invite-team <orgId> <compId> <inviteeActorId> <inviteeLabel> [--message text]
  npm run cli -- comp-invite-link <orgId> <compId> [--regenerate]
  npm run cli -- entry-invite-accept <teamName> (--id invitationId | --code code) [--key creationKey]`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function compInviteTeam(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId, inviteeActorId, inviteeLabel] = yield* requirePositionals(
      common.positionals,
      4,
      USAGE,
    );
    const message = flagString(common.flags, "message") ?? null;
    const invitation = yield* apiCall(configOf(common), (client) =>
      client.entryInvitations.invite(organizationId, competitionId, {
        inviteeActorId,
        inviteeLabel,
        message,
      }),
    );
    if (common.json) {
      printJson(invitation);
    } else {
      print(`${invitation.id}\t${invitation.status}\t${invitation.inviteeLabel}`);
    }
    return 0;
  });
}

export function compInviteLink(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, competitionId] = yield* requirePositionals(common.positionals, 2, USAGE);
    const regenerate = flagBoolean(common.flags, "regenerate");
    const result = yield* apiCall(configOf(common), (client) =>
      regenerate
        ? client.entryInvitations.regenerateLink(organizationId, competitionId)
        : client.entryInvitations.getLink(organizationId, competitionId),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`${result.link.id}\t${result.link.code}`);
    }
    return 0;
  });
}

export function entryInviteAccept(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [teamName] = yield* requirePositionals(common.positionals, 1, USAGE);
    const invitationId = flagString(common.flags, "id");
    const code = flagString(common.flags, "code");
    if ((invitationId === undefined) === (code === undefined)) {
      return yield* new UsageError({
        message: "Indica exactamente uno de --id o --code.",
        usage: USAGE,
      });
    }
    const creationKey = flagString(common.flags, "key") ?? `cli-entry-invite-${randomUUID()}`;
    const target = invitationId !== undefined ? { invitationId } : { code: code ?? "" };
    const accepted = yield* apiCall(configOf(common), (client) =>
      client.entryInvitations.accept(target, { teamName, creationKey }),
    );
    if (common.json) {
      printJson(accepted);
    } else {
      print(
        `${accepted.application.entryId}\t${accepted.application.teamName}\t${accepted.application.status}`,
      );
    }
    return 0;
  });
}
