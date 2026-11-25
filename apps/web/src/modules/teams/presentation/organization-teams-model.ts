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
  | { readonly kind: "forbidden" }
  | { readonly kind: "data"; readonly participants: readonly CompetitionEntryDto[] };

export type CompetitionsListState = "loading" | "error" | "forbidden" | "ready";

export type ParticipationFilterReadiness = "ready" | "loading" | "error" | "forbidden";

export type TeamStatusFilter = "all" | "pending" | "none";

export type OrganizationTeamsFilter = {
  readonly query: string;
  readonly status: TeamStatusFilter;
  readonly competitionId: string;
};

export type TeamStatusSummary =
  | { readonly kind: "pending"; readonly count: number }
  | { readonly kind: "approved"; readonly count: number }
  | { readonly kind: "rejected"; readonly count: number }
  | { readonly kind: "none" }
  | { readonly kind: "unavailable" };

export type OrganizationTeamsSummary = {
  readonly totalTeams: number;
  readonly activeTeams: number | null;
  readonly pendingEntries: number | null;
};

const STATUS_ORDER = {
  pending: 0,
  approved: 1,
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

export function filterOrganizationTeams(
  teams: readonly TeamDto[],
  filter: OrganizationTeamsFilter,
  index: TeamParticipationIndex,
): readonly TeamDto[] {
  const byName = filterTeamsByName(teams, filter.query);
  const filterByCompetition = filter.competitionId !== "all" && filter.competitionId.length > 0;
  if (!filterByCompetition && filter.status === "all") return byName;

  return byName.filter((team) => {
    const entries = index.byTeam.get(team.id) ?? [];
    if (filter.status === "none") {
      return !filterByCompetition && index.complete && entries.length === 0;
    }
    const scopedEntries = filterByCompetition
      ? entries.filter((entry) => entry.competitionId === filter.competitionId)
      : entries;
    if (filterByCompetition && scopedEntries.length === 0) {
      return false;
    }
    if (filter.status === "pending") {
      return scopedEntries.some((entry) => entry.status === "pending");
    }
    return true;
  });
}

/**
 * Determines whether the currently active participation filter (competition and/or entry status)
 * has enough data to treat an empty result or count as definitive. Name-only search never depends
 * on participation reads and is always `"ready"`.
 */
export function getParticipationFilterReadiness(
  filter: OrganizationTeamsFilter,
  competitions: readonly CompetitionDto[],
  results: readonly CompetitionParticipantsResult[],
  competitionsState: CompetitionsListState,
): ParticipationFilterReadiness {
  const filterByCompetition = filter.competitionId !== "all" && filter.competitionId.length > 0;
  if (!filterByCompetition && filter.status === "all") {
    return "ready";
  }
  if (competitionsState !== "ready") {
    return competitionsState;
  }
  if (filterByCompetition) {
    if (filter.status === "none") {
      return "ready";
    }
    const competitionIndex = competitions.findIndex(
      (competition) => competition.id === filter.competitionId,
    );
    if (competitionIndex === -1) {
      return "ready";
    }
    const result = results[competitionIndex];
    if (!result || result.kind === "loading") return "loading";
    if (result.kind === "error") return "error";
    if (result.kind === "forbidden") return "forbidden";
    return "ready";
  }
  if (results.some((result) => result.kind === "loading")) return "loading";
  if (results.some((result) => result.kind === "error")) return "error";
  if (results.some((result) => result.kind === "forbidden")) return "forbidden";
  return "ready";
}

export function buildTeamParticipationIndex(
  competitions: readonly CompetitionDto[],
  results: readonly CompetitionParticipantsResult[],
  /** False while the competition list itself is unknown (loading, failed or refused). */
  competitionsKnown = true,
): TeamParticipationIndex {
  const byTeam = new Map<string, TeamParticipation[]>();
  let complete = competitionsKnown;
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

export function summarizeOrganizationTeams(
  teams: readonly TeamDto[],
  index: TeamParticipationIndex,
): OrganizationTeamsSummary {
  if (!index.complete) {
    return {
      totalTeams: teams.length,
      activeTeams: null,
      pendingEntries: null,
    };
  }
  let activeTeams = 0;
  let pendingEntries = 0;
  for (const team of teams) {
    const entries = index.byTeam.get(team.id) ?? [];
    if (entries.some((entry) => entry.status === "approved" || entry.status === "pending")) {
      activeTeams += 1;
    }
    for (const entry of entries) {
      if (entry.status === "pending") pendingEntries += 1;
    }
  }
  return {
    totalTeams: teams.length,
    activeTeams,
    pendingEntries,
  };
}

export function summarizeTeamStatus(
  entries: readonly TeamParticipation[],
  complete: boolean,
): TeamStatusSummary {
  if (entries.length === 0) {
    return complete ? { kind: "none" } : { kind: "unavailable" };
  }
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  for (const entry of entries) {
    if (entry.status === "pending") pending += 1;
    else if (entry.status === "approved") approved += 1;
    else rejected += 1;
  }
  if (pending > 0) return { kind: "pending", count: pending };
  if (approved > 0) return { kind: "approved", count: approved };
  return { kind: "rejected", count: rejected };
}

export function teamInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return Array.from(words[0] ?? "")
      .slice(0, 2)
      .join("")
      .toLocaleUpperCase();
  }
  const first = Array.from(words[0] ?? "")[0] ?? "";
  const second = Array.from(words[1] ?? "")[0] ?? "";
  return `${first}${second}`.toLocaleUpperCase();
}

export function formatTeamCreatedAt(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}
