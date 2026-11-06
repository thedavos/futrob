import type { FixtureEncounter, FixturePlan } from "@futrob/scheduling";
import type { TeamId } from "@futrob/shared-kernel";

export type PairedEncounter = {
  readonly encounter: FixtureEncounter;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly roundNumber: number;
};

/**
 * Encounters of a plan still to be played or already played: two teams on the slots, which leaves
 * out byes and placeholders, and not closed without a result, which will never have one.
 */
export function pairedEncounters(plan: FixturePlan): PairedEncounter[] {
  return plan.stages.flatMap((stage) =>
    stage.rounds.flatMap((round) =>
      round.encounters.flatMap((encounter): PairedEncounter[] =>
        encounter.home.kind === "team" &&
        encounter.away.kind === "team" &&
        !encounter.closedWithoutResult
          ? [
              {
                encounter,
                homeTeamId: encounter.home.teamId,
                awayTeamId: encounter.away.teamId,
                roundNumber: round.number,
              },
            ]
          : [],
      ),
    ),
  );
}
