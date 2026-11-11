import { Effect, Either } from "effect";
import {
  listOrganizationAuditQuerySchema,
  type ListOrganizationAuditResponse,
} from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { ApiError, UsageError, type CliError } from "../lib/errors.ts";
import { apiCall, type ClientConfig } from "../lib/futrob-client.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const USAGE =
  "npm run cli -- audit-list <orgId> [--competition id] [--by-actor id] [--action code] [--from ISO] [--to ISO] [--cursor cursor] [--limit 25]";
const SMOKE_USAGE = "npm run cli -- audit-smoke <orgId> --outsider <actorId> [--competition id]";

export function auditList(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, USAGE);
    const query = listOrganizationAuditQuerySchema.safeParse({
      competitionId: flagString(common.flags, "competition"),
      actorId: flagString(common.flags, "by-actor"),
      action: flagString(common.flags, "action"),
      from: flagString(common.flags, "from"),
      to: flagString(common.flags, "to"),
      cursor: flagString(common.flags, "cursor"),
      limit: flagString(common.flags, "limit"),
    });
    if (!query.success)
      return yield* new UsageError({ message: "Filtros de auditoría no válidos.", usage: USAGE });
    const response = yield* apiCall(
      { baseUrl: common.baseUrl, actorId: common.actorId },
      (client) => client.audit.list(organizationId, query.data),
    );
    if (common.json) printJson(response);
    else {
      if (response.entries.length === 0) print("Sin entradas de auditoría.");
      for (const entry of response.entries)
        print(
          `${entry.occurredAt}\t${entry.actorName ?? entry.actorId ?? "Sin actor registrado"}\t${entry.action}\t${entry.object.label ?? entry.object.id}\t${entry.reason ?? "Sin motivo registrado"}`,
        );
      if (response.nextCursor) print(`Siguiente página: --cursor ${response.nextCursor}`);
    }
    return 0;
  });
}

export function auditSmoke(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId] = yield* requirePositionals(common.positionals, 1, SMOKE_USAGE);
    const outsider = flagString(common.flags, "outsider");
    if (!outsider)
      return yield* new UsageError({ message: "Falta --outsider <actorId>.", usage: SMOKE_USAGE });
    const config: ClientConfig = { baseUrl: common.baseUrl, actorId: common.actorId };
    const competitionId = flagString(common.flags, "competition");
    const refused = yield* Effect.either(
      apiCall({ ...config, actorId: outsider }, (client) =>
        client.audit.list(organizationId, { competitionId }),
      ),
    );
    const entries: ListOrganizationAuditResponse["entries"] = [];
    let cursor: string | undefined;
    const visited = new Set<string>();
    let cursorCycle = false;
    do {
      const page = yield* apiCall(config, (client) =>
        client.audit.list(organizationId, { competitionId, cursor, limit: 2 }),
      );
      entries.push(...page.entries);
      cursor = page.nextCursor ?? undefined;
      if (cursor && visited.has(cursor)) {
        cursorCycle = true;
        break;
      }
      if (cursor) visited.add(cursor);
    } while (cursor);
    const first = entries[0];
    const filtered = first
      ? yield* apiCall(config, (client) =>
          client.audit.list(organizationId, { competitionId, action: first.action }),
        )
      : null;
    const checks = {
      outsiderRefused:
        Either.isLeft(refused) && refused.left instanceof ApiError && refused.left.status === 403,
      organizationIsolation: entries.every((entry) => entry.organizationId === organizationId),
      competitionIsolation:
        !competitionId || entries.every((entry) => entry.competitionId === competitionId),
      noDuplicateEntries: new Set(entries.map((entry) => entry.id)).size === entries.length,
      noCursorCycle: !cursorCycle,
      ordered: entries.every(
        (entry, index) => index === 0 || entry.occurredAt <= entries[index - 1].occurredAt,
      ),
      actionFilter:
        filtered === null || filtered.entries.every((entry) => entry.action === first?.action),
    };
    const ok = Object.values(checks).every(Boolean);
    if (common.json) printJson({ ok, checks, entries: entries.length, pages: visited.size + 1 });
    else
      for (const [name, passed] of Object.entries(checks)) print(`${passed ? "✓" : "✗"} ${name}`);
    return ok ? 0 : 1;
  });
}
