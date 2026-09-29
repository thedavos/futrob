import type {
  ExploreCompetitionDto,
  ExploreCompetitionsResponse,
  GetExploreCompetitionResponse,
  ListAccessibleCompetitionsResponse,
  ListMyMembershipsResponse,
} from "@futrob/api-contracts";

export function exploreCompetitionFixture(
  overrides: {
    readonly competition?: Partial<ExploreCompetitionDto["competition"]>;
    readonly organization?: Partial<ExploreCompetitionDto["organization"]>;
    readonly approvedTeamCount?: number;
  } = {},
): ExploreCompetitionDto {
  const { competition, organization, approvedTeamCount, ...rest } = overrides;
  return {
    competition: {
      id: "competition-liga-nocturna",
      organizationId: "org-cuervos",
      name: "Liga Nocturna",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 4, max: 12 },
      schedule: { startsOn: "2026-08-15", endsOn: "2026-11-30" },
      cover: { kind: "preset", preset: "league" },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
      ...competition,
    },
    organization: {
      id: "org-cuervos",
      name: "Liga Cuervos",
      ...organization,
    },
    approvedTeamCount: approvedTeamCount ?? 8,
    ...rest,
  };
}

export function explorePageFixture(
  items: readonly ExploreCompetitionDto[] = [
    exploreCompetitionFixture(),
    exploreCompetitionFixture({
      approvedTeamCount: 4,
      competition: {
        id: "competition-copa-invierno",
        organizationId: "org-fera",
        name: "Copa Invierno",
        status: "paused",
        format: "knockout",
        platform: "xbox",
        region: "europe",
        updatedAt: "2026-09-18T12:00:00.000Z",
      },
      organization: { id: "org-fera", name: "Fera Enjaulada" },
    }),
    exploreCompetitionFixture({
      approvedTeamCount: 3,
      competition: {
        id: "competition-copa-apertura",
        organizationId: "org-fera",
        name: "Copa Apertura",
        status: "registration",
        teams: { min: 8, max: 16 },
        schedule: { startsOn: "2026-10-12", endsOn: null },
        cover: { kind: "preset", preset: "cup" },
        format: "knockout",
        platform: "playstation",
        region: "south-america",
        updatedAt: "2026-09-22T12:00:00.000Z",
      },
      organization: { id: "org-fera", name: "Fera Enjaulada" },
    }),
    exploreCompetitionFixture({
      approvedTeamCount: 12,
      competition: {
        id: "competition-super-final",
        organizationId: "org-atlas",
        name: "Súper Final",
        status: "finished",
        cover: { kind: "upload", key: "competition-covers/org-atlas/super-final.png" },
        format: "league-playoffs",
        platform: "pc",
        region: "america",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
      organization: { id: "org-atlas", name: "Atlas Pro" },
    }),
  ],
  nextCursor: string | null = null,
): ExploreCompetitionsResponse {
  return {
    items: [...items],
    total: items.length,
    nextCursor,
  };
}

export function exploreDetailFixture(
  overrides?: Parameters<typeof exploreCompetitionFixture>[0],
): GetExploreCompetitionResponse {
  return exploreCompetitionFixture(overrides);
}

export function exploreMembershipsFixture(
  role: "organizer" | "staff" | "member" = "organizer",
): ListMyMembershipsResponse {
  return {
    memberships: [{ organizationId: "org-cuervos", organizationName: "Liga Cuervos", role }],
  };
}

export function exploreAccessibleFixture(
  competitionIds: readonly string[] = ["competition-liga-nocturna"],
): ListAccessibleCompetitionsResponse {
  return {
    competitions: competitionIds.map((id) => ({
      competition: exploreCompetitionFixture({ competition: { id } }).competition,
      role: "player" as const,
    })),
  };
}
