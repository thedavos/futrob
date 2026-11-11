import { Effect, Either } from "effect";
import { SANCTION_LIMITS, type GetCompetitionStandingsResponse } from "@futrob/api-contracts";
import { ApiError, UsageError, type CliError } from "../lib/errors.ts";
import { apiCall, type ClientConfig } from "../lib/futrob-client.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

const LIST_USAGE = "npm run cli -- sanction-list <orgId> <compId> [--team <teamId>] [--json]";
const SMOKE_USAGE =
  "npm run cli -- sanctions-smoke <orgId> <compId> <teamId> --outsider <actorId> [--points 3] [--json]";

function positionals(values: readonly string[], count: number, usage: string) {
  return values.length >= count
    ? Effect.succeed(values)
    : Effect.fail(new UsageError({ message: "Faltan argumentos.", usage }));
}

/** Lists a competition's sanctions, or one Team's with `--team`. */
export function sanctionList(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId = "", competitionId = ""] = yield* positionals(
      common.positionals,
      2,
      LIST_USAGE,
    );
    const config: ClientConfig = { baseUrl: common.baseUrl, actorId: common.actorId };
    const teamId = flagString(common.flags, "team");
    const result = yield* apiCall(config, (client) =>
      teamId
        ? client.sanctions.listForTeam(organizationId, competitionId, teamId)
        : client.sanctions.list(organizationId, competitionId),
    );
    if (common.json) {
      printJson(result);
      return 0;
    }
    if (result.sanctions.length === 0) print("Sin sanciones.");
    for (const sanction of result.sanctions) {
      print(
        `${sanction.id}\t${sanction.type}\t${sanction.targetType}:${sanction.playerProfileId ?? sanction.teamId}\t${sanction.revocation ? "revoked" : "active"}\t${sanction.reason}`,
      );
    }
    return 0;
  });
}

function teamPoints(response: GetCompetitionStandingsResponse, teamId: string) {
  const row = response.standings?.rows.find((candidate) => candidate.teamId === teamId);
  return { points: row?.points ?? 0, pointsDeducted: row?.pointsDeducted ?? 0 };
}

/** The status of a call that must be refused; a success is a failed check. */
function refusalStatus<A>(effect: Effect.Effect<A, CliError>): Effect.Effect<number | "allowed"> {
  return Effect.either(effect).pipe(
    Effect.map((outcome) =>
      Either.isLeft(outcome)
        ? outcome.left instanceof ApiError
          ? outcome.left.status
          : -1
        : ("allowed" as const),
    ),
  );
}

/**
 * Live smoke for SANC-01 (ADR-0028) against a published competition with an approved Team:
 * an outsider is refused, a points deduction moves the table and revoking restores it,
 * and the revoked sanction is still listed with its audit trail.
 */
export function sanctionsSmoke(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [organizationId = "", competitionId = "", teamId = ""] = yield* positionals(
      common.positionals,
      3,
      SMOKE_USAGE,
    );
    const outsider = flagString(common.flags, "outsider");
    if (!outsider) {
      return yield* new UsageError({ message: "Falta --outsider <actorId>.", usage: SMOKE_USAGE });
    }
    const points = Number(flagString(common.flags, "points") ?? "3");
    if (!Number.isInteger(points) || points < 1 || points > SANCTION_LIMITS.maxPointsDeducted) {
      return yield* new UsageError({
        message: `--points debe ser un entero entre 1 y ${SANCTION_LIMITS.maxPointsDeducted}.`,
        usage: SMOKE_USAGE,
      });
    }
    const organizer: ClientConfig = { baseUrl: common.baseUrl, actorId: common.actorId };
    const stranger: ClientConfig = { baseUrl: common.baseUrl, actorId: outsider };
    const scope = { organizationId, competitionId };
    const standings = () =>
      apiCall(organizer, (client) => client.statistics.getCompetitionStandings(scope)).pipe(
        Effect.map((response) => teamPoints(response, teamId)),
      );

    const before = yield* standings();
    const outsiderImpose = yield* refusalStatus(
      apiCall(stranger, (client) =>
        client.sanctions.impose(organizationId, competitionId, {
          target: { type: "team", teamId },
          type: "warning",
          reason: "CLI smoke: outsider",
        }),
      ),
    );
    const imposed = yield* apiCall(organizer, (client) =>
      client.sanctions.impose(organizationId, competitionId, {
        target: { type: "team", teamId },
        type: "points_deduction",
        pointsDeducted: points,
        reason: "CLI smoke: points deduction",
      }),
    );
    const during = yield* standings();
    const outsiderRevoke = yield* refusalStatus(
      apiCall(stranger, (client) =>
        client.sanctions.revoke(organizationId, competitionId, imposed.id, {
          reason: "CLI smoke: outsider",
        }),
      ),
    );
    const revoked = yield* apiCall(organizer, (client) =>
      client.sanctions.revoke(organizationId, competitionId, imposed.id, {
        reason: "CLI smoke: revoke",
      }),
    );
    const after = yield* standings();
    const listed = yield* apiCall(organizer, (client) =>
      client.sanctions.list(organizationId, competitionId),
    );
    const kept = listed.sanctions.find((sanction) => sanction.id === imposed.id);

    const checks = {
      outsiderImposeRefused: outsiderImpose === 403,
      outsiderRevokeRefused: outsiderRevoke === 403,
      auditOnImpose:
        imposed.imposedByActorId.length > 0 &&
        imposed.requestId.length > 0 &&
        imposed.reason === "CLI smoke: points deduction",
      deductionApplied:
        during.points === before.points - points &&
        during.pointsDeducted === before.pointsDeducted + points,
      tableRestoredAfterRevoke:
        after.points === before.points && after.pointsDeducted === before.pointsDeducted,
      revokedKeptWithAudit:
        kept?.revocation?.reason === "CLI smoke: revoke" &&
        (revoked.revocation?.requestId.length ?? 0) > 0,
    };
    const ok = Object.values(checks).every(Boolean);
    const evidence = {
      ok,
      checks,
      statuses: { outsiderImpose, outsiderRevoke },
      table: { before, during, after },
      sanctionId: imposed.id,
    };
    if (common.json) printJson(evidence);
    else {
      for (const [name, passed] of Object.entries(checks)) {
        print(`${passed ? "✓" : "✗"} ${name}`);
      }
      print(`PTS ${before.points} → ${during.points} → ${after.points}`);
    }
    return ok ? 0 : 1;
  });
}
