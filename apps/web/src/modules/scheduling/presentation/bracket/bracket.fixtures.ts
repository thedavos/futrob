import type {
  FixtureEncounterDto,
  FixtureParticipantSlotDto,
  FixtureStageDto,
  GetCurrentCompetitionFixtureResponse,
} from "@futrob/api-contracts";

/**
 * Story and test data only. Shapes follow the fixture contract as the generator writes it:
 * encounter orders count from 1 inside each round and later rounds point at winners.
 */

const PLAN = "fixture-cup";
const TEAM_NAMES = [
  "Cuervos FC",
  "Maderas FC",
  "Club Atlético Halcones del Pacífico",
  "Lobos del Norte",
  "Real Tormenta",
  "Deportivo Faro",
  "Atlético Brasa",
  "Unión Marea",
  "Sporting Cumbre",
  "Racing Volcán",
  "Estrella Polar",
  "Nómadas CF",
  "Titanes 92",
  "Rayo Andino",
  "Celeste United",
  "Pumas Costa",
] as const;

const teamId = (index: number) => `team-${index + 1}`;
const team = (index: number): FixtureParticipantSlotDto => ({
  kind: "team",
  teamId: teamId(index),
});
const BYE: FixtureParticipantSlotDto = { kind: "bye" };

const roundId = (stageId: string, round: number) => `${stageId}:round:${round}`;
const encounterId = (stageId: string, round: number, order: number) =>
  `${roundId(stageId, round)}:encounter:${order}`;

const DAY = 24 * 60 * 60 * 1000;
const kickoff = (start: string, roundIndex: number, order: number) =>
  new Date(
    Date.parse(start) + roundIndex * 7 * DAY + (order - 1) * 2 * 60 * 60 * 1000,
  ).toISOString();

type KnockoutOptions = {
  readonly stageId: string;
  readonly stageOrder: number;
  readonly kind?: "knockout" | "playoffs";
  /** First-round pairs, in encounter order. */
  readonly opening: readonly (readonly [FixtureParticipantSlotDto, FixtureParticipantSlotDto])[];
  readonly start?: string;
  readonly twoLegs?: boolean;
  /** Replace a later slot, e.g. a Team already advanced or an unknown source. */
  readonly override?: (
    round: number,
    order: number,
    side: "home" | "away",
  ) => FixtureParticipantSlotDto | undefined;
};

/** A halving draw: each later Encounter takes the winners of two earlier ones. */
export function knockoutStage({
  stageId,
  stageOrder,
  kind = "knockout",
  opening,
  start = "2026-11-02T19:00:00.000Z",
  twoLegs = false,
  override,
}: KnockoutOptions): FixtureStageDto {
  const rounds: FixtureStageDto["rounds"] = [];
  let pairs = opening.map(([home, away]) => ({ home, away }));
  let number = 1;
  while (pairs.length > 0) {
    const roundNumber = number;
    const encounters: FixtureEncounterDto[] = pairs.map((pair, index) => {
      const order = index + 1;
      return {
        id: encounterId(stageId, roundNumber, order),
        stageId,
        roundId: roundId(stageId, roundNumber),
        order,
        home: override?.(roundNumber, order, "home") ?? pair.home,
        away: override?.(roundNumber, order, "away") ?? pair.away,
        scheduledStartAt: kickoff(start, roundNumber - 1, order),
        officialMatchCount: twoLegs && pairs.length > 1 ? 2 : 1,
        series: null,
      };
    });
    rounds.push({
      id: roundId(stageId, roundNumber),
      stageId,
      number: roundNumber,
      scheduledStartAt: kickoff(start, roundNumber - 1, 1),
      encounters,
    });
    if (encounters.length === 1) break;
    pairs = Array.from({ length: encounters.length / 2 }, (_, index) => ({
      home: { kind: "winner", encounterId: encounters[index * 2]?.id ?? "" } as const,
      away: { kind: "winner", encounterId: encounters[index * 2 + 1]?.id ?? "" } as const,
    }));
    number += 1;
  }
  return { id: stageId, kind, order: stageOrder, rounds };
}

function response(
  stages: readonly FixtureStageDto[],
  format: "knockout" | "groups-knockout" | "league-playoffs" | "league",
  teamCount: number,
  extraTeams: GetCurrentCompetitionFixtureResponse["teams"] = [],
): GetCurrentCompetitionFixtureResponse {
  return {
    fixture: {
      id: PLAN,
      revision: 1,
      status: "active",
      generationKey: "competition-1:1",
      organizationId: "org-1",
      competitionId: "competition-1",
      rulesVersion: 1,
      generationVersion: 1,
      format,
      timeZone: "Europe/Madrid",
      homeAndAway: false,
      seed: Array.from({ length: teamCount }, (_, index) => teamId(index)),
      stages: [...stages],
    },
    teams: [
      ...Array.from({ length: teamCount }, (_, index) => ({
        teamId: teamId(index),
        name: TEAM_NAMES[index] ?? `Equipo ${index + 1}`,
      })),
      ...extraTeams,
    ],
  };
}

const pairsOf = (count: number) =>
  Array.from({ length: count / 2 }, (_, index) => [team(index * 2), team(index * 2 + 1)] as const);

const KO = `${PLAN}:stage:1`;

/** Sixteen Teams, single match, round of 16 to the final. */
export const sixteenTeamKnockout = response(
  [knockoutStage({ stageId: KO, stageOrder: 1, opening: pairsOf(16) })],
  "knockout",
  16,
);

/** Eight Teams, two legs until the final. */
export const eightTeamTwoLegs = response(
  [knockoutStage({ stageId: KO, stageOrder: 1, opening: pairsOf(8), twoLegs: true })],
  "knockout",
  8,
);

/** Four Teams. */
export const fourTeamKnockout = response(
  [knockoutStage({ stageId: KO, stageOrder: 1, opening: pairsOf(4) })],
  "knockout",
  4,
);

/** Two Teams: the final is the whole draw. */
export const twoTeamFinal = response(
  [knockoutStage({ stageId: KO, stageOrder: 1, opening: pairsOf(2) })],
  "knockout",
  2,
);

/** Six Teams in an eight-place draw: the two top seeds rest in the first round. */
export const sixTeamsWithByes = response(
  [
    knockoutStage({
      stageId: KO,
      stageOrder: 1,
      opening: [
        [team(0), BYE],
        [team(1), team(2)],
        [team(3), BYE],
        [team(4), team(5)],
      ],
    }),
  ],
  "knockout",
  6,
);

/**
 * A Team already advanced into the semifinal (the slot no longer names its source) and a
 * winner place whose source is not in the fixture. Neither may draw a line.
 */
export const uncertainSources = response(
  [
    knockoutStage({
      stageId: KO,
      stageOrder: 1,
      opening: pairsOf(8),
      override: (round, order, side) => {
        if (round === 2 && order === 1 && side === "home") return team(0);
        if (round === 2 && order === 2 && side === "away") {
          return { kind: "winner", encounterId: "fixture-cup:missing-encounter" };
        }
        return undefined;
      },
    }),
  ],
  "knockout",
  8,
  [],
);

const GROUPS = `${PLAN}:stage:groups`;
const KO_AFTER_GROUPS = `${PLAN}:stage:knockout`;

/** Groups then knockout: the draw starts from group places, not named Teams. */
export const groupsThenKnockout = response(
  [
    {
      id: GROUPS,
      kind: "groups",
      order: 1,
      rounds: [
        {
          id: roundId(GROUPS, 1),
          stageId: GROUPS,
          number: 1,
          scheduledStartAt: "2026-10-12T19:00:00.000Z",
          encounters: [0, 1, 2, 3].map((index) => ({
            id: encounterId(GROUPS, 1, index + 1),
            stageId: GROUPS,
            roundId: roundId(GROUPS, 1),
            order: index + 1,
            groupId: `group-${(index % 2) + 1}`,
            home: team(index * 2),
            away: team(index * 2 + 1),
            scheduledStartAt: "2026-10-12T19:00:00.000Z",
            officialMatchCount: 1 as const,
            series: null,
          })),
        },
      ],
    },
    knockoutStage({
      stageId: KO_AFTER_GROUPS,
      stageOrder: 2,
      start: "2026-10-26T19:00:00.000Z",
      opening: [
        [
          { kind: "group-rank", stageId: GROUPS, groupId: "group-1", rank: 1 },
          { kind: "group-rank", stageId: GROUPS, groupId: "group-2", rank: 2 },
        ],
        [
          { kind: "group-rank", stageId: GROUPS, groupId: "group-2", rank: 1 },
          { kind: "group-rank", stageId: GROUPS, groupId: "group-1", rank: 2 },
        ],
      ],
    }),
  ],
  "groups-knockout",
  8,
);

const LEAGUE = `${PLAN}:stage:league`;

const leagueStage: FixtureStageDto = {
  id: LEAGUE,
  kind: "league",
  order: 1,
  rounds: [1, 2].map((number) => ({
    id: roundId(LEAGUE, number),
    stageId: LEAGUE,
    number,
    scheduledStartAt: `2026-10-${10 + number}T19:00:00.000Z`,
    encounters: [
      {
        id: encounterId(LEAGUE, number, 1),
        stageId: LEAGUE,
        roundId: roundId(LEAGUE, number),
        order: 1,
        home: team(number === 1 ? 0 : 1),
        away: team(number === 1 ? 1 : 0),
        scheduledStartAt: `2026-10-${10 + number}T19:00:00.000Z`,
        officialMatchCount: 1 as const,
        series: null,
      },
    ],
  })),
};

/** League then playoffs for the top four. */
export const leagueThenPlayoffs = response(
  [
    leagueStage,
    knockoutStage({
      stageId: `${PLAN}:stage:playoffs`,
      stageOrder: 2,
      kind: "playoffs",
      start: "2026-11-09T19:00:00.000Z",
      opening: [
        [
          { kind: "stage-rank", stageId: LEAGUE, rank: 1 },
          { kind: "stage-rank", stageId: LEAGUE, rank: 4 },
        ],
        [
          { kind: "stage-rank", stageId: LEAGUE, rank: 2 },
          { kind: "stage-rank", stageId: LEAGUE, rank: 3 },
        ],
      ],
    }),
  ],
  "league-playoffs",
  4,
);

/** A pure league: nothing to draw. */
export const leagueOnly = response([leagueStage], "league", 2);

export const noFixture: GetCurrentCompetitionFixtureResponse = { fixture: null, teams: [] };
