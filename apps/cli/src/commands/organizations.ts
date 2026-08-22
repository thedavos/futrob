import { Effect } from "effect";
import { organizationInviteRoleSchema } from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const ORG_USAGE = `Uso:
  npm run cli -- org-name-check <name>
  npm run cli -- org-create <name>
  npm run cli -- org-mine
  npm run cli -- org-invite <organizationId> <email> [--role organizer|staff]`;

function configOf(common: ReturnType<typeof parseCommon>): ClientConfig {
  return { baseUrl: common.baseUrl, actorId: common.actorId };
}

export function orgNameCheck(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [name] = yield* requirePositionals(common.positionals, 1, ORG_USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.organizations.checkNameAvailability({ name }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`${name}: ${result.available ? "disponible" : "no disponible"}`);
    }
    return 0;
  });
}

export function orgCreate(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [name] = yield* requirePositionals(common.positionals, 1, ORG_USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.organizations.create({ name }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Organización creada: ${result.organizationId} (${result.name}) role=${result.role}`);
    }
    return 0;
  });
}

export function orgMine(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const result = yield* apiCall(configOf(common), (client) => client.organizations.listMine());
    if (common.json) {
      printJson(result);
      return 0;
    }
    for (const membership of result.memberships) {
      print(`${membership.organizationId}\t${membership.role}`);
    }
    return 0;
  });
}

export function orgInvite(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId, email] = yield* requirePositionals(common.positionals, 2, ORG_USAGE);
    const role = organizationInviteRoleSchema.parse(flagString(common.flags, "role") ?? "staff");
    const result = yield* apiCall(configOf(common), (client) =>
      client.organizations.createInvitation(organizationId, { email, role }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`Invitación creada para ${email}`);
    }
    return 0;
  });
}
