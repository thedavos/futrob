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
  npm run cli -- org-create <name> [--slug slug] [--time-zone IANA]
  npm run cli -- org-slug-check <slug> [--org organizationId]
  npm run cli -- org-profile <organizationId>
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
    const slug = flagString(common.flags, "slug");
    const timeZone = flagString(common.flags, "time-zone") ?? "UTC";
    const result = yield* apiCall(configOf(common), (client) =>
      client.organizations.create({ name, timeZone, slug }),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(
        `Organización creada: ${result.organizationId} (${result.name}) slug=${result.slug} tz=${result.timeZone} role=${result.role}`,
      );
    }
    return 0;
  });
}

export function orgSlugCheck(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [slug] = yield* requirePositionals(common.positionals, 1, ORG_USAGE);
    const organizationId = flagString(common.flags, "org");
    const result = yield* apiCall(configOf(common), (client) =>
      client.organizations.checkSlugAvailability({ slug, organizationId }),
    );
    if (common.json) {
      printJson(result);
    } else if (result.available) {
      print(`${slug}: disponible`);
    } else {
      const reason = result.reason === "invalid" ? "no válido" : "en uso";
      print(`${slug}: ${reason}${result.suggestion ? ` (sugerido: ${result.suggestion})` : ""}`);
    }
    return 0;
  });
}

export function orgProfile(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, ORG_USAGE);
    const result = yield* apiCall(configOf(common), (client) =>
      client.organizations.get(organizationId),
    );
    if (common.json) {
      printJson(result);
    } else {
      print(`${result.name}\tslug=${result.slug}\ttz=${result.timeZone}\tlogo=${result.logo.kind}`);
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
      print(`${membership.organizationId}\t${membership.organizationSlug}\t${membership.role}`);
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
