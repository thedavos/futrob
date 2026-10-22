import type {
  CompetitionDto,
  CompetitionEntryDto,
  CompetitionEntryStatusDto,
  TeamDto,
} from "@futrob/api-contracts";

export type TeamParticipation = {
  readonly competitionId: string;
  readonly competitionName: string;
  readonly status: CompetitionEntryStatusDto;
};

/**
 * Participation of every team across the competitions that loaded.
 * `complete` is false when a competition's participants could not be read, so a team
 * without entries is then unknown rather than "not registered".
 */
export type TeamParticipationIndex = {
  readonly byTeam: ReadonlyMap<string, readonly TeamParticipation[]>;
  readonly complete: boolean;
};

export type CompetitionParticipantsResult =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "data"; readonly participants: readonly CompetitionEntryDto[] };

const STATUS_ORDER = {
  approved: 0,
  pending: 1,
  rejected: 2,
} as const satisfies Record<CompetitionEntryStatusDto, number>;

function searchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

/** The API returns every team of the organization, so searching by name is purely local. */
export function filterTeamsByName(teams: readonly TeamDto[], query: string): readonly TeamDto[] {
  const needle = searchValue(query);
  if (needle.length === 0) return teams;
  return teams.filter((team) => searchValue(team.name).includes(needle));
}

export function buildTeamParticipationIndex(
  competitions: readonly CompetitionDto[],
  results: readonly CompetitionParticipantsResult[],
): TeamParticipationIndex {
  const byTeam = new Map<string, TeamParticipation[]>();
  let complete = true;
  competitions.forEach((competition, index) => {
    const result = results[index];
    if (result?.kind !== "data") {
      complete = false;
      return;
    }
    for (const entry of result.participants) {
      const list = byTeam.get(entry.teamId) ?? [];
      list.push({
        competitionId: competition.id,
        competitionName: competition.name,
        status: entry.status,
      });
      byTeam.set(entry.teamId, list);
    }
  });
  for (const list of byTeam.values()) {
    list.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.competitionName.localeCompare(b.competitionName),
    );
  }
  return { byTeam, complete };
}

export function formatTeamCreatedAt(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}
