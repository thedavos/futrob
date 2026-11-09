import { Effect } from "effect";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
} from "@futrob/api-contracts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import { UsageError, type CliError } from "../lib/errors.ts";
import { flagBoolean, flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

function step(label: string): void {
  print(`→ ${label}`);
}

export function run(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const config: ClientConfig = { baseUrl: common.baseUrl, actorId: common.actorId };
    const suffix = flagBoolean(common.flags, "keep-names") ? "" : `-${Date.now()}`;
    const gameEdition = flagString(common.flags, "edition") ?? "fc27";
    const platform = competitionPlatformSchema.parse(
      flagString(common.flags, "platform") ?? "playstation",
    );

    const format = competitionFormatSchema.parse(flagString(common.flags, "format") ?? "league");
    if (format !== "league" && format !== "swiss") {
      return yield* new UsageError({
        message: `Formato no soportado por este smoke: ${format}`,
        usage: "npm run cli -- e2e-golden-path [--format league|swiss] [--superuser <id>]",
      });
    }
    const teamLabels = format === "swiss" ? ["A", "B", "C", "D"] : ["A", "B"];
    const superuser = flagString(common.flags, "superuser");

    step("1/8 meta.ping");
    yield* apiCall(config, (client) => client.meta.ping());

    step("2/8 organizations.create");
    const org = yield* apiCall(config, (client) =>
      client.organizations.create({ name: `CLI Golden Path${suffix}`, timeZone: "UTC" }),
    );
    if (superuser) {
      yield* apiCall({ ...config, actorId: superuser }, (client) =>
        client.billing.assignOrganizationPlan(org.organizationId, {
          planKey: "pro",
          state: { status: "active" },
          reason: "CLI golden path",
        }),
      );
    }

    step("3/8 competitions.createDraft");
    const comp = yield* apiCall(config, (client) =>
      client.competitions.createDraft(org.organizationId, {
        name: `${format === "swiss" ? "Suizo" : "Liga"} CLI${suffix}`,
        gameEdition,
        platform,
        region: competitionRegionSchema.parse("america"),
        timeZone: "UTC",
        format,
      }),
    );
    const competitionId = comp.competition.id;

    step(`4/8 teams.createTeam ×${teamLabels.length}`);
    const teams = yield* Effect.forEach(teamLabels, (label) =>
      apiCall(config, (client) =>
        client.teams.createTeam(org.organizationId, { name: `Equipo ${label}${suffix}` }),
      ),
    );

    step(`5/8 competitions.registerTeamEntry ×${teamLabels.length}`);
    const entries = yield* Effect.forEach(teams, (team) =>
      apiCall(config, (client) =>
        client.competitions.registerTeamEntry(org.organizationId, competitionId, {
          teamId: team.id,
        }),
      ),
    );

    step(`6/8 entries.approve ×${teamLabels.length}`);
    yield* Effect.forEach(entries, (entry) =>
      apiCall(config, (client) =>
        client.competitions.approveTeamEntry(org.organizationId, competitionId, entry.id),
      ),
    );

    step("7/8 competitions.publish");
    yield* apiCall(config, (client) =>
      client.competitions.publish(org.organizationId, competitionId),
    );

    step("8/8 encounters.generateFixture");
    const plan = yield* apiCall(config, (client) =>
      client.encounters.generateFixture(org.organizationId, competitionId, {
        generationVersion: 1,
        startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        roundIntervalDays: 7,
        homeAndAway: false,
      }),
    );
    const encounterCount = plan.stages.reduce(
      (total, stage) =>
        total + stage.rounds.reduce((sum, round) => sum + round.encounters.length, 0),
      0,
    );

    print("Golden path OK");
    printJson({
      organizationId: org.organizationId,
      competitionId,
      fixturePlanId: plan.id,
      format: plan.format,
      roundCount: plan.stages.reduce((total, stage) => total + stage.rounds.length, 0),
      encounterCount,
    });
    return 0;
  });
}
