import { Effect } from "effect";
import { asCompetitionId, asEncounterId, asTeamId, err, isOk, ok } from "@futrob/shared-kernel";
import type { Encounter } from "@futrob/scheduling";
import type { SelectionStatus } from "@futrob/results";
import { print, printJson } from "../lib/print.ts";

type DomainSmokeOutput = {
  readonly encounter: Encounter;
  readonly selectionStatus: SelectionStatus;
  readonly result: {
    readonly encounterId: ReturnType<typeof asEncounterId>;
    readonly selectionStatus: SelectionStatus;
  };
};

/**
 * Minimal smoke while domain use cases are still stubs.
 * Replace / extend with real use-case runs + in-memory fakes.
 */
export function run(): Effect.Effect<number> {
  return Effect.sync(() => {
    const encounter: Encounter = {
      id: asEncounterId("enc_smoke_1"),
      competitionId: asCompetitionId("comp_smoke_1"),
      roundId: "round_1",
      homeTeamId: asTeamId("team_home"),
      awayTeamId: asTeamId("team_away"),
      scheduledStartAt: new Date("2026-08-01T18:00:00.000Z"),
      slots: [
        {
          slotNumber: 1,
          scheduledStartAt: new Date("2026-08-01T18:00:00.000Z"),
          status: "scheduled",
        },
        {
          slotNumber: 2,
          scheduledStartAt: new Date("2026-08-01T18:45:00.000Z"),
          status: "scheduled",
        },
      ],
    };

    const selectionStatus: SelectionStatus = "awaiting_provider_data";
    const success = ok({ encounterId: encounter.id, selectionStatus });
    const failure = err({ code: "domain.smoke.example_error" as const });

    if (!isOk(success) || failure.isOk()) {
      return 1;
    }

    print("domain-smoke ok");
    printJson({
      encounter,
      selectionStatus,
      result: success.value,
    } satisfies DomainSmokeOutput);
    print("Next: wire SelectOfficialMatchesUseCase with in-memory fakes (results-smoke).");
    return 0;
  });
}
