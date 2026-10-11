import type { ActivitySubject } from "@futrob/notifications";
import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/** Names an activity row shows. Reads public repositories of their owners. */
export interface ActivitySubjectReaders {
  readonly competitions: {
    findById(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<{ readonly competition: { readonly name: string } } | null>;
  };
  readonly teams: {
    findById(
      organizationId: OrganizationId,
      teamId: TeamId,
    ): Promise<{ readonly name: string } | null>;
  };
}

export async function competitionName(
  readers: ActivitySubjectReaders,
  organizationId: OrganizationId,
  competitionId: CompetitionId,
): Promise<string | null> {
  const found = await readers.competitions.findById(organizationId, competitionId);
  return found?.competition.name ?? null;
}

export async function teamName(
  readers: ActivitySubjectReaders,
  organizationId: OrganizationId,
  teamId: TeamId,
): Promise<string | null> {
  return (await readers.teams.findById(organizationId, teamId))?.name ?? null;
}

/** `Home vs Away`, or null when either name is missing. */
export async function encounterSubject(
  readers: ActivitySubjectReaders,
  encounter: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly homeTeamId: TeamId;
    readonly awayTeamId: TeamId;
  },
): Promise<Omit<ActivitySubject, "teamName">> {
  const [competition, home, away] = await Promise.all([
    competitionName(readers, encounter.organizationId, encounter.competitionId),
    teamName(readers, encounter.organizationId, encounter.homeTeamId),
    teamName(readers, encounter.organizationId, encounter.awayTeamId),
  ]);
  return {
    competitionName: competition,
    encounterLabel: home && away ? `${home} vs ${away}` : null,
  };
}
