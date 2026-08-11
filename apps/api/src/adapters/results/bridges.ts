import type { ExternalReference, ProviderMatch, ProviderMatchRepository } from "@futrob/game-data";
import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot as ResultsEncounterSnapshot,
  ProviderMatchReaderPort,
} from "@futrob/results";
import type { EncounterScheduleRepository } from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";
import type { ExternalClubConnectionRepository } from "@futrob/teams";

const CANDIDATE_WINDOW_MS = 36 * 60 * 60 * 1000;

export class SchedulingEncounterReader implements EncounterReaderPort {
  constructor(
    private readonly schedules: EncounterScheduleRepository,
    private readonly connections: ExternalClubConnectionRepository,
  ) {}

  async getById(encounterId: EncounterId): Promise<ResultsEncounterSnapshot | null> {
    const snapshot = await this.schedules.findById(encounterId);
    if (!snapshot) return null;

    const [home, away] = await Promise.all([
      this.connections.findByTeam(snapshot.homeTeamId),
      this.connections.findByTeam(snapshot.awayTeamId),
    ]);

    return {
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
      competitionId: snapshot.competitionId,
      homeTeamId: snapshot.homeTeamId,
      awayTeamId: snapshot.awayTeamId,
      scheduledStartAt: snapshot.scheduledStartAt,
      officialMatchCount: snapshot.officialMatchCount,
      homeExternalClubId: home?.externalClubId ?? null,
      awayExternalClubId: away?.externalClubId ?? null,
      providerKey: home?.providerKey ?? "ea-clubs",
    };
  }
}

export class RepositoryProviderMatchReader implements ProviderMatchReaderPort {
  constructor(
    private readonly matches: ProviderMatchRepository,
    private readonly schedules: EncounterScheduleRepository,
    private readonly connections: ExternalClubConnectionRepository,
  ) {}

  async getByExternalRef(ref: ExternalReference): Promise<ProviderMatch | null> {
    return this.matches.findByExternalId({
      providerKey: ref.providerKey,
      externalMatchId: ref.externalId,
    });
  }

  async listCandidatesForEncounter(encounterId: EncounterId): Promise<ProviderMatch[]> {
    const snapshot = await this.schedules.findById(encounterId);
    if (!snapshot) return [];

    const [home, away] = await Promise.all([
      this.connections.findByTeam(snapshot.homeTeamId),
      this.connections.findByTeam(snapshot.awayTeamId),
    ]);
    if (!home || !away) return [];

    const halfWindow = CANDIDATE_WINDOW_MS / 2;
    const from = new Date(snapshot.scheduledStartAt.getTime() - halfWindow);
    const to = new Date(snapshot.scheduledStartAt.getTime() + halfWindow);

    return this.matches.listBetweenClubs({
      providerKey: home.providerKey || "ea-clubs",
      homeExternalClubId: home.externalClubId,
      awayExternalClubId: away.externalClubId,
      from,
      to,
    });
  }
}
