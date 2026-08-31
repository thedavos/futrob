import type { PlayerGameProfileDto } from "@futrob/api-contracts";

type StatBlock = PlayerGameProfileDto["summary"];
type AttributeCategory = PlayerGameProfileDto["attributes"][number];
type AttributeComponent = AttributeCategory["components"][number];

const COMPLETE_PARTIAL: StatBlock["partial"] = {
  minutes: false,
  goals: false,
  assists: false,
  shots: false,
  passAttempts: false,
  passesMade: false,
  tackleAttempts: false,
  tacklesMade: false,
  saves: false,
  yellowCards: false,
  redCards: false,
  mvpAwards: false,
  rating: false,
};

function component(
  key: AttributeComponent["key"],
  input: {
    readonly weight: number;
    readonly raw: number | null;
    readonly rawKind: AttributeComponent["rawKind"];
    readonly score: number | null;
    readonly points: number;
    readonly confidence?: number;
    readonly sampleCount?: number;
  },
): AttributeComponent {
  return {
    key,
    weight: input.weight,
    raw: input.raw,
    rawKind: input.rawKind,
    score: input.score,
    points: input.points,
    confidence: input.confidence ?? 1,
    sampleCount: input.sampleCount ?? 28,
  };
}

function statBlock(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    matchesPlayed: 28,
    wins: 16,
    draws: 4,
    losses: 8,
    minutes: 2520,
    totals: {
      goals: 18,
      assists: 11,
      shots: 64,
      passAttempts: 412,
      passesMade: 338,
      tackleAttempts: 54,
      tacklesMade: 37,
      saves: 0,
      yellowCards: 3,
      redCards: 0,
      mvpAwards: 4,
      rating: 201.6,
    },
    averages: {
      goals: 0.64,
      assists: 0.39,
      shots: 2.29,
      passAttempts: 14.71,
      passesMade: 12.07,
      tackleAttempts: 1.93,
      tacklesMade: 1.32,
      saves: 0,
      yellowCards: 0.11,
      redCards: 0,
      mvpAwards: 0.14,
      rating: 7.2,
    },
    partial: COMPLETE_PARTIAL,
    ...overrides,
  };
}

function readyAttributes(): PlayerGameProfileDto["attributes"] {
  return [
    {
      category: "attack",
      score: 72,
      components: [
        component("goalsPerMatch", {
          weight: 0.3,
          raw: 0.64,
          rawKind: "perMatch",
          score: 64,
          points: 19,
        }),
        component("shotsPerMatch", {
          weight: 0.2,
          raw: 2.29,
          rawKind: "perMatch",
          score: 58,
          points: 12,
        }),
        component("shotAccuracy", {
          weight: 0.25,
          raw: 0.28,
          rawKind: "percent",
          score: 61,
          points: 15,
        }),
        component("offensiveRoleRating", {
          weight: 0.25,
          raw: 7.4,
          rawKind: "rating",
          score: 74,
          points: 19,
        }),
      ],
    },
    {
      category: "pass",
      score: 68,
      components: [
        component("passSuccess", {
          weight: 0.55,
          raw: 0.82,
          rawKind: "percent",
          score: 82,
          points: 45,
        }),
        component("passVolume", {
          weight: 0.45,
          raw: 14.71,
          rawKind: "perMatch",
          score: 51,
          points: 23,
        }),
      ],
    },
    {
      category: "defense",
      score: 41,
      components: [
        component("tacklesMadePerMatch", {
          weight: 0.35,
          raw: 1.32,
          rawKind: "perMatch",
          score: 44,
          points: 15,
        }),
        component("tackleSuccess", {
          weight: 0.35,
          raw: 0.69,
          rawKind: "percent",
          score: 69,
          points: 24,
        }),
        component("defensiveRoleRating", {
          weight: 0.3,
          raw: 6.1,
          rawKind: "rating",
          score: 41,
          points: 12,
          confidence: 0.4,
          sampleCount: 6,
        }),
      ],
    },
    {
      category: "impact",
      score: 77,
      components: [
        component("averageRating", {
          weight: 0.4,
          raw: 7.2,
          rawKind: "rating",
          score: 72,
          points: 29,
        }),
        component("winRate", {
          weight: 0.3,
          raw: 0.57,
          rawKind: "percent",
          score: 57,
          points: 17,
        }),
        component("goalsAssistsPerMatch", {
          weight: 0.3,
          raw: 1.04,
          rawKind: "perMatch",
          score: 71,
          points: 21,
        }),
      ],
    },
    {
      category: "discipline",
      score: 88,
      components: [
        component("fewerRedsPerMatch", {
          weight: 1,
          raw: 0,
          rawKind: "perMatch",
          score: 88,
          points: 88,
        }),
      ],
    },
  ];
}

function readyEvolution(): PlayerGameProfileDto["evolution"] {
  return [
    { occurredAt: "2026-07-20T22:10:00.000Z", rating: 6.4, outcome: "loss" },
    { occurredAt: "2026-07-27T23:05:00.000Z", rating: 7.1, outcome: "win" },
    { occurredAt: "2026-08-03T00:40:00.000Z", rating: null, outcome: "draw" },
    { occurredAt: "2026-08-10T02:00:00.000Z", rating: 7.8, outcome: "win" },
    { occurredAt: "2026-08-17T01:20:00.000Z", rating: 7.2, outcome: "unknown" },
  ];
}

/** Ready profile used by Mis estadísticas stories (davos282 / Cuervos). */
export function gameProfileReadyFixture(
  overrides: Partial<PlayerGameProfileDto> = {},
): PlayerGameProfileDto {
  const summary = overrides.summary ?? statBlock();
  return {
    sampleSize: 28,
    identity: {
      displayName: "davos282",
      preferredPosition: "forward",
      preferredRole: "attack",
    },
    attributes: readyAttributes(),
    evolution: readyEvolution(),
    summary,
    byTeam: [
      { clubId: "725178", clubName: "Cuervos FC1", ...summary },
      {
        clubId: "710267",
        clubName: "White Lions",
        ...statBlock({
          matchesPlayed: 4,
          wins: 2,
          draws: 1,
          losses: 1,
          minutes: 360,
        }),
      },
    ],
    byPosition: [
      { position: "forward", role: "attack", ...summary },
      {
        position: "midfielder",
        role: "midfield",
        ...statBlock({
          matchesPlayed: 6,
          wins: 3,
          draws: 1,
          losses: 2,
          minutes: 480,
        }),
      },
    ],
    ...overrides,
  };
}

export function gameProfileEmptySampleFixture(): PlayerGameProfileDto {
  return gameProfileReadyFixture({
    sampleSize: 0,
    attributes: [],
    evolution: [],
    summary: statBlock({
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      minutes: 0,
    }),
    byTeam: [],
    byPosition: [],
  });
}

export function gameProfilePartialFixture(): PlayerGameProfileDto {
  const summary = statBlock({
    minutes: null,
    averages: {
      goals: 0.64,
      assists: 0.39,
      shots: null,
      passAttempts: 14.71,
      passesMade: 12.07,
      tackleAttempts: 1.93,
      tacklesMade: 1.32,
      saves: 0,
      yellowCards: 0.11,
      redCards: 0,
      mvpAwards: 0.14,
      rating: null,
    },
    partial: {
      ...COMPLETE_PARTIAL,
      minutes: true,
      shots: true,
      rating: true,
    },
  });
  return gameProfileReadyFixture({
    summary,
    byTeam: [{ clubId: "725178", clubName: "Cuervos FC1", ...summary }],
    byPosition: [{ position: "forward", role: "attack", ...summary }],
  });
}

export function gameProfileEmptyEvolutionFixture(): PlayerGameProfileDto {
  return gameProfileReadyFixture({ evolution: [] });
}

export function gameProfileUnavailableRatingFixture(): PlayerGameProfileDto {
  return gameProfileReadyFixture({
    evolution: readyEvolution().map((point) => ({ ...point, rating: null })),
  });
}
