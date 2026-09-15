import type { ExternalReference, ProviderMatch, ProviderMatchRepository } from "@futrob/game-data";
import type {
  CandidateMatchReadResult,
  CandidateMatchQuery,
  EncounterReaderPort,
  EncounterScheduleSnapshot as ResultsEncounterSnapshot,
  ProviderMatchReaderPort,
} from "@futrob/results";
import type { EncounterScheduleRepository } from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";
import type { ExternalClubConnectionRepository } from "@futrob/teams";

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
      stageId: snapshot.stageId,
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
