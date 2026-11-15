import type {
  FixtureEncounterDto,
  FixtureParticipantSlotDto,
  GetCurrentCompetitionFixtureResponse,
} from "@futrob/api-contracts";

const PLAN = "fixture-1";
const GROUPS = `${PLAN}:stage:1`;
const KNOCKOUT = `${PLAN}:stage:2`;

const team = (teamId: string): FixtureParticipantSlotDto => ({ kind: "team", teamId });

function encounter(
  stageId: string,
  round: number,
  order: number,
  home: FixtureParticipantSlotDto,
  away: FixtureParticipantSlotDto,
  scheduledStartAt: string,
  extra: Partial<FixtureEncounterDto> = {},
): FixtureEncounterDto {
  return {
    id: `${stageId}:round:${round}:encounter:${order}`,
    stageId,
    roundId: `${stageId}:round:${round}`,
    order,
    home,
    away,
    scheduledStartAt,
    officialMatchCount: 1,
    series: null,
    ...extra,
  };
}

const semifinal1 = encounter(
  KNOCKOUT,
  1,
  1,
  { kind: "group-rank", stageId: GROUPS, groupId: "group-1", rank: 1 },
  { kind: "group-rank", stageId: GROUPS, groupId: "group-2", rank: 2 },
  "2026-10-26T01:00:00.000Z",
  { officialMatchCount: 2 },
);
const semifinal2 = encounter(
  KNOCKOUT,
  1,
  2,
  { kind: "group-rank", stageId: GROUPS, groupId: "group-2", rank: 1 },
  { kind: "group-rank", stageId: GROUPS, groupId: "group-1", rank: 2 },
  "2026-10-26T01:00:00.000Z",
  { officialMatchCount: 2 },
);

/** Groups then knockout: named Teams, a Team that no longer resolves, and open slots. */
export const groupsKnockoutFixture: GetCurrentCompetitionFixtureResponse = {
  fixture: {
    id: PLAN,
    revision: 1,
    status: "active",
    generationKey: "competition-1:1",
    organizationId: "org-1",
    competitionId: "competition-1",
    rulesVersion: 1,
    generationVersion: 1,
    format: "groups-knockout",
    timeZone: "America/Lima",
    homeAndAway: true,
    seed: ["team-cuervos", "team-maderas", "team-halcones", "team-gone"],
    stages: [
      {
        id: GROUPS,
        kind: "groups",
        order: 1,
        rounds: [1, 2].map((number) => ({
          id: `${GROUPS}:round:${number}`,
          stageId: GROUPS,
          number,
          scheduledStartAt: number === 1 ? "2026-10-12T01:00:00.000Z" : "2026-10-19T01:00:00.000Z",
          encounters: [
            encounter(
              GROUPS,
              number,
              1,
              team(number === 1 ? "team-cuervos" : "team-maderas"),
              team(number === 1 ? "team-maderas" : "team-cuervos"),
              number === 1 ? "2026-10-12T01:00:00.000Z" : "2026-10-19T01:00:00.000Z",
              { groupId: "group-1" },
            ),
            encounter(
              GROUPS,
              number,
              2,
              team(number === 1 ? "team-halcones" : "team-gone"),
              team(number === 1 ? "team-gone" : "team-halcones"),
              number === 1 ? "2026-10-12T03:30:00.000Z" : "2026-10-19T03:30:00.000Z",
              { groupId: "group-2" },
            ),
          ],
        })),
      },
      {
        id: KNOCKOUT,
        kind: "knockout",
        order: 2,
        rounds: [
          {
            id: `${KNOCKOUT}:round:1`,
            stageId: KNOCKOUT,
            number: 1,
            scheduledStartAt: "2026-10-26T01:00:00.000Z",
            encounters: [semifinal1, semifinal2],
          },
          {
            id: `${KNOCKOUT}:round:2`,
            stageId: KNOCKOUT,
            number: 2,
            scheduledStartAt: "2026-11-02T01:00:00.000Z",
            encounters: [
              encounter(
                KNOCKOUT,
                2,
                1,
                { kind: "winner", encounterId: semifinal1.id },
                { kind: "winner", encounterId: semifinal2.id },
                "2026-11-02T01:00:00.000Z",
              ),
            ],
          },
        ],
      },
    ],
  },
  teams: [
    { teamId: "team-cuervos", name: "Cuervos FC" },
    { teamId: "team-maderas", name: "Maderas FC" },
    { teamId: "team-halcones", name: "Club Atlético Halcones del Pacífico" },
  ],
};

export const noFixture: GetCurrentCompetitionFixtureResponse = { fixture: null, teams: [] };

const SWISS = `${PLAN}:stage:swiss`;
const swissStart = (round: number) => `2026-11-${String(round * 7).padStart(2, "0")}T01:00:00.000Z`;

/**
 * Round 3 of 4 of a Swiss stage: an official or open match, a closed one, a bye,
 * a withdrawn Team, and a last round not paired yet.
 */
export const swissFixture: GetCurrentCompetitionFixtureResponse = {
  fixture: {
    ...groupsKnockoutFixture.fixture!,
    format: "swiss",
    homeAndAway: false,
    seed: ["team-cuervos", "team-maderas", "team-halcones", "team-sur", "team-norte"],
    withdrawnTeamIds: ["team-norte"],
    stages: [
      {
        id: SWISS,
        kind: "swiss",
        order: 1,
        rounds: [
          {
            id: `${SWISS}:round:1`,
            stageId: SWISS,
            number: 1,
            scheduledStartAt: swissStart(1),
            encounters: [
              encounter(SWISS, 1, 1, team("team-cuervos"), team("team-norte"), swissStart(1)),
              encounter(SWISS, 1, 2, team("team-maderas"), team("team-halcones"), swissStart(1), {
                closedWithoutResult: true,
              }),
              encounter(SWISS, 1, 3, team("team-sur"), { kind: "bye" }, swissStart(1)),
            ],
          },
          {
            id: `${SWISS}:round:2`,
            stageId: SWISS,
            number: 2,
            scheduledStartAt: swissStart(2),
            encounters: [
              encounter(SWISS, 2, 1, team("team-cuervos"), team("team-sur"), swissStart(2)),
              encounter(SWISS, 2, 2, team("team-maderas"), { kind: "bye" }, swissStart(2)),
            ],
          },
          {
            id: `${SWISS}:round:3`,
            stageId: SWISS,
            number: 3,
            scheduledStartAt: swissStart(3),
            encounters: [],
          },
          {
            id: `${SWISS}:round:4`,
            stageId: SWISS,
            number: 4,
            scheduledStartAt: swissStart(4),
            encounters: [],
          },
        ],
      },
    ],
  },
  teams: [
    { teamId: "team-cuervos", name: "Cuervos FC" },
    { teamId: "team-maderas", name: "Maderas FC" },
    { teamId: "team-halcones", name: "Club Atlético Halcones del Pacífico" },
    { teamId: "team-sur", name: "Sur United" },
    { teamId: "team-norte", name: "Norte Athletic" },
  ],
};
