import type { ActivityEntryDto } from "@futrob/api-contracts";

export const ACTIVITY_STORY_NOW = new Date("2026-10-07T12:00:00.000Z");

function activity(overrides: Partial<ActivityEntryDto> & Pick<ActivityEntryDto, "id">) {
  return {
    organizationId: "org-1",
    competitionId: "cmp-1",
    audience: "organization",
    kind: "match_dispute",
    status: "open",
    requiresAction: true,
    resourceType: "encounter",
    resourceId: "enc-1",
    subject: {
      competitionName: "Liga Nocturna",
      encounterLabel: "Nova FC vs Atlas",
      teamName: null,
    },
    openedAt: "2026-10-07T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-10-07T10:00:00.000Z",
    ...overrides,
  } satisfies ActivityEntryDto;
}

/** One row of every kind the organization sees, newest first. */
export const organizationActivityFixture: readonly ActivityEntryDto[] = [
  activity({
    id: "published",
    kind: "competition_published",
    status: "closed",
    requiresAction: false,
    resourceType: "competition",
    resourceId: "cmp-1",
    subject: { competitionName: "Copa Primavera", encounterLabel: null, teamName: null },
    openedAt: "2026-10-07T11:40:00.000Z",
    closedAt: "2026-10-07T11:40:00.000Z",
    lastEventAt: "2026-10-07T11:40:00.000Z",
  }),
  activity({ id: "dispute" }),
  activity({
    id: "selection",
    kind: "selection_confirmation",
    requiresAction: false,
    subject: {
      competitionName: "Liga Nocturna",
      encounterLabel: "Titans vs Orion",
      teamName: "Orion",
    },
    expiresAt: "2026-10-08T09:00:00.000Z",
    openedAt: "2026-10-07T09:00:00.000Z",
    lastEventAt: "2026-10-07T09:00:00.000Z",
  }),
  activity({
    id: "invitation",
    kind: "roster_invitation",
    requiresAction: false,
    resourceType: "roster_invitation",
    resourceId: "inv-1",
    subject: { competitionName: "Liga Nocturna", encounterLabel: null, teamName: "Nova FC" },
    expiresAt: "2026-10-10T09:00:00.000Z",
    openedAt: "2026-10-06T18:00:00.000Z",
    lastEventAt: "2026-10-06T18:00:00.000Z",
  }),
  activity({
    id: "resolved",
    status: "closed",
    subject: {
      competitionName: "Liga Nocturna",
      encounterLabel: "Halcones vs Cuervos",
      teamName: null,
    },
    openedAt: "2026-10-05T18:00:00.000Z",
    closedAt: "2026-10-06T08:00:00.000Z",
    lastEventAt: "2026-10-06T08:00:00.000Z",
  }),
];

/** Pending work of a captain and invitee in the personal space. */
export const personalPendingFixture: readonly ActivityEntryDto[] = [
  activity({
    id: "confirm",
    audience: "team",
    kind: "selection_confirmation",
    subject: {
      competitionName: "Liga Nocturna",
      encounterLabel: "Nova FC vs Atlas",
      teamName: "Atlas",
    },
    expiresAt: "2026-10-08T09:00:00.000Z",
  }),
  activity({
    id: "invite",
    audience: "actor",
    kind: "roster_invitation",
    resourceType: "roster_invitation",
    resourceId: "inv-2",
    subject: { competitionName: "Copa Primavera", encounterLabel: null, teamName: "Titans" },
    openedAt: "2026-10-04T12:00:00.000Z",
    lastEventAt: "2026-10-04T12:00:00.000Z",
  }),
];

export function manyActivities(count: number): readonly ActivityEntryDto[] {
  return Array.from({ length: count }, (_, index) =>
    activity({
      id: `row-${index}`,
      subject: {
        competitionName: "Liga Nocturna",
        encounterLabel: `Encuentro ${index + 1}`,
        teamName: null,
      },
    }),
  );
}
