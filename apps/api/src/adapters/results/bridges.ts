import type { ExternalReference, ProviderMatch, ProviderMatchRepository } from "@futrob/game-data";
import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot as ResultsEncounterSnapshot,
  ProviderMatchReaderPort,
} from "@futrob/results";
import type { EncounterScheduleRepository } from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";

const CANDIDATE_WINDOW_MS = 36 * 60 * 60 * 1000;

export class SchedulingEncounterReader implements EncounterReaderPort {
  constructor(private readonly schedules: EncounterScheduleRepository) {}

  async getById(encounterId: EncounterId): Promise<ResultsEncounterSnapshot | null> {
    const snapshot = await this.schedules.findById(encounterId);
    if (!snapshot) return null;
    return {
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
      competitionId: snapshot.competitionId,
      homeTeamId: snapshot.homeTeamId,
      awayTeamId: snapshot.awayTeamId,
      scheduledStartAt: snapshot.scheduledStartAt,
      officialMatchCount: snapshot.officialMatchCount,
      homeExternalClubId: null,
      awayExternalClubId: null,
      providerKey: "ea-clubs",
    };
  }
}

export class RepositoryProviderMatchReader implements ProviderMatchReaderPort {
  constructor(
    private readonly matches: ProviderMatchRepository,
    private readonly schedules: EncounterScheduleRepository,
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
    // Without club ids on the schedule snapshot yet, return empty candidates.
    // Sync + club linkage will fill this once encounters carry external club refs.
    void snapshot;
    void CANDIDATE_WINDOW_MS;
    return [];
  }
}
