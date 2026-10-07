import type { ExternalReference, ProviderMatch, ProviderMatchRepository } from "@futrob/game-data";
import type {
  CandidateMatchReadResult,
  CandidateMatchQuery,
  EncounterReaderPort,
  EncounterScheduleSnapshot as ResultsEncounterSnapshot,
  ProviderMatchReaderPort,
  TeamRepresentation,
  TeamRepresentationPort,
} from "@futrob/results";
import type { CompetitionEntryRepository } from "@futrob/competitions";
import {
  officialMatchSchedules,
  type EncounterScheduleRepository,
  type OfficialMatchRepository,
} from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembershipRepository,
  ExternalClubConnectionRepository,
  PlayerProfileRepository,
} from "@futrob/teams";

export class SchedulingEncounterReader implements EncounterReaderPort {
  constructor(
    private readonly schedules: EncounterScheduleRepository,
    private readonly officialMatches: Pick<OfficialMatchRepository, "listByEncounter">,
    private readonly connections: ExternalClubConnectionRepository,
  ) {}

  async getById(encounterId: EncounterId): Promise<ResultsEncounterSnapshot | null> {
    const snapshot = await this.schedules.findById(encounterId);
    if (!snapshot) return null;

    const [matches, home, away] = await Promise.all([
      this.officialMatches.listByEncounter(encounterId),
      this.connections.findByTeam(snapshot.homeTeamId),
      this.connections.findByTeam(snapshot.awayTeamId),
    ]);

    return {
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
      competitionId: snapshot.competitionId,
      stageId: snapshot.stageId,
      homeTeamId: snapshot.homeTeamId,
      awayTeamId: snapshot.awayTeamId,
      scheduledStartAt: snapshot.scheduledStartAt,
      officialMatchCount: snapshot.officialMatchCount,
      officialMatchStarts: officialMatchSchedules(snapshot, matches),
      homeExternalClubId: home?.externalClubId ?? null,
      awayExternalClubId: away?.externalClubId ?? null,
      providerKey: home?.providerKey ?? "ea-clubs",
    };
  }
}

export class RepositoryProviderMatchReader implements ProviderMatchReaderPort {
  constructor(
    private readonly matches: ProviderMatchRepository,
    private readonly connections: ExternalClubConnectionRepository,
  ) {}

  async getByExternalRef(ref: ExternalReference): Promise<ProviderMatch | null> {
    return this.matches.findByExternalId({
      providerKey: ref.providerKey,
      externalMatchId: ref.externalId,
    });
  }

  async listCandidatesForEncounter(input: CandidateMatchQuery): Promise<CandidateMatchReadResult> {
    const [home, away] = await Promise.all([
      this.connections.findByTeam(input.homeTeamId),
      this.connections.findByTeam(input.awayTeamId),
    ]);
    if (!home || !away) {
      const sides: Array<"home" | "away"> = [];
      if (!home) sides.push("home");
      if (!away) sides.push("away");
      return {
        status: "clubs_not_connected",
        sides,
      };
    }
    if (home.providerKey !== away.providerKey) {
      return { status: "provider_mismatch" };
    }

    const matches = await this.matches.listBetweenClubs({
      providerKey: home.providerKey,
      homeExternalClubId: home.externalClubId,
      awayExternalClubId: away.externalClubId,
      from: input.window.from,
      to: input.window.to,
    });
    return { status: "ready", matches };
  }
}

/**
 * Answers "does this actor speak for this Team" from the roster: captain or
 * vice-captain of the Team in the competition, with an approved entry. The
 * roster and entry are read by Team, so a client-supplied Team never grants access.
 */
export class RosterTeamRepresentationReader implements TeamRepresentationPort {
  constructor(
    private readonly deps: {
      readonly profiles: Pick<PlayerProfileRepository, "findByActor">;
      readonly rosters: Pick<CompetitionRosterMembershipRepository, "findByTeamPlayerCompetition">;
      readonly entries: Pick<CompetitionEntryRepository, "findByCompetitionAndTeam">;
    },
  ) {}

  async findRepresentation(
    input: Parameters<TeamRepresentationPort["findRepresentation"]>[0],
  ): Promise<TeamRepresentation | null> {
    const profile = await this.deps.profiles.findByActor(input.actorId);
    if (!profile) return null;
    const membership = await this.deps.rosters.findByTeamPlayerCompetition(
      input.teamId,
      profile.id,
      input.competitionId,
    );
    if (!membership || membership.organizationId !== input.organizationId) return null;
    if (membership.role !== "captain" && membership.role !== "vice_captain") return null;
    const entry = await this.deps.entries.findByCompetitionAndTeam(
      input.organizationId,
      input.competitionId,
      input.teamId,
    );
    if (entry?.status !== "approved") return null;
    return { teamId: input.teamId, role: membership.role };
  }
}
