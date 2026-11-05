import { attempt, type SeedContext } from "./context.ts";
import {
  createConfiguredDraft,
  currentRounds,
  enrollTeams,
  playMatches,
  publishWithFixture,
  syncClubs,
  syncTargets,
  type CompetitionHandle,
  type matchRules,
  type OrgHandle,
  type PlayableEncounter,
  type RosterSlot,
  type TeamHandle,
} from "./engine.ts";
import { playOfficial, playWithAlternative, type StoryInput } from "./stories.ts";

interface BuildCompetitionInput {
  readonly org: OrgHandle;
  readonly name: string;
  readonly format: "league" | "knockout" | "groups-knockout" | "league-playoffs";
  readonly cover: "cup" | "classic" | "groups" | "league" | "lightning" | "playoffs" | "supercup";
  readonly teams: readonly TeamHandle[];
  readonly rosters: ReadonlyArray<readonly RosterSlot[]>;
  readonly regular: ReturnType<typeof matchRules> | null;
  readonly knockout: ReturnType<typeof matchRules> | null;
  readonly startsAt: Date;
  readonly maxTeams?: number;
  readonly existingCompetitionId?: string;
  readonly fixture: {
    readonly roundIntervalDays: number;
    readonly groups?: { readonly count: number; readonly qualifiersPerGroup: number };
    readonly playoffs?: { readonly teamCount: number };
  };
}

export async function buildCompetition(
  context: SeedContext,
  input: BuildCompetitionInput,
): Promise<CompetitionHandle> {
  const competitionId = await createConfiguredDraft(context, {
    org: input.org,
    name: input.name,
    format: input.format,
    cover: input.cover,
    maxTeams: input.maxTeams ?? null,
    regularStage: input.regular,
    knockoutStage: input.knockout,
    startsOn: input.startsAt,
    endsOn: null,
    existingCompetitionId: input.existingCompetitionId,
  });
  const captains = await enrollTeams(
    context,
    input.org,
    competitionId,
    input.teams.map((team, index) => ({ team, roster: input.rosters[index] ?? [] })),
  );
  await publishWithFixture(context, input.org, competitionId, {
    startsAt: input.startsAt,
    roundIntervalDays: input.fixture.roundIntervalDays,
    seed: input.teams.map((team) => team.id),
    groups: input.fixture.groups,
    playoffs: input.fixture.playoffs,
  });
  return { org: input.org, id: competitionId, name: input.name, captains, teams: input.teams };
}

type SimpleStory = "official" | "alternative" | "tie" | "skip";

/**
 * Plays past rounds in order. Knockout rounds only know their Teams once the previous
 * round is official, so the fixture is read again before each round.
 */
export async function playAllRounds(
  context: SeedContext,
  competition: CompetitionHandle,
  random: () => number,
  storyFor: (encounter: PlayableEncounter, index: number) => SimpleStory,
): Promise<void> {
  const played = new Set<string>();
  for (let guard = 0; guard < 20; guard += 1) {
    const rounds = await currentRounds(context, competition);
    const next = rounds.find(
      (round) =>
        round.kickoff.getTime() < context.now.getTime() &&
        round.encounters.some((encounter) => !played.has(encounter.id)),
    );
    if (!next) return;
    const pending = next.encounters.filter((encounter) => !played.has(encounter.id));
    const stories = pending.map((encounter, index) => ({
      encounter,
      story: storyFor(encounter, index),
    }));
    const matches = new Map(
      stories.map(({ encounter, story }) => [
        encounter.id,
        story === "skip"
          ? []
          : playMatches(context, competition, encounter, {
              random,
              extra: story === "alternative" ? 1 : 0,
              scores: scoresFor(story, encounter, random),
            }),
      ]),
    );
    await syncClubs(
      context,
      competition.org.id,
      syncTargets([...matches.values()].map((encounterMatches) => ({ matches: encounterMatches }))),
    );
    // Sequential within a competition: parallel transactions starve the connection pool.
    for (const { encounter, story } of stories) {
      played.add(encounter.id);
      const encounterMatches = matches.get(encounter.id) ?? [];
      if (story === "skip" || encounterMatches.length === 0) continue;
      const input: StoryInput = { context, competition, encounter, matches: encounterMatches };
      await attempt(context, `${competition.name} ${encounter.id} (${story})`, async () => {
        if (story === "alternative") await playWithAlternative(input);
        else await playOfficial(input);
      });
    }
  }
}

/** A draw for the tie story; knockout games need a winner; league games are random. */
function scoresFor(
  story: SimpleStory,
  encounter: PlayableEncounter,
  random: () => number,
): ReadonlyArray<readonly [number, number]> | undefined {
  if (story === "tie") return [[2, 2]];
  if (encounter.stageKind === "knockout" || encounter.stageKind === "playoffs") {
    return [decisiveScore(random)];
  }
  return undefined;
}

function decisiveScore(random: () => number): readonly [number, number] {
  const winner = 1 + Math.floor(random() * 3);
  const loser = Math.floor(random() * winner);
  return random() < 0.5 ? [winner, loser] : [loser, winner];
}

/** No product command finishes, pauses or archives a competition yet: write the status. */
export async function closeCompetition(
  context: SeedContext,
  competitionId: string,
  status: "finished" | "archived" | "paused",
): Promise<void> {
  await context.pool.query(
    "UPDATE competitions SET status = $2, updated_at = NOW() WHERE id = $1",
    [competitionId, status],
  );
}
