import type { ProviderSyncCompletionPort } from "@futrob/game-data";
import {
  candidateWindowFor,
  type AssociateEncounterCandidatesError,
  type AssociateEncounterCandidatesUseCase,
} from "@futrob/results";
import type { EncounterWindowReaderPort } from "@futrob/scheduling";
import { err, ok, asOrganizationId, type Result, type TeamId } from "@futrob/shared-kernel";
import type { ExternalClubTeamReaderPort } from "@futrob/teams";

export class AssociateSyncedProviderMatches implements ProviderSyncCompletionPort {
  constructor(
    private readonly deps: {
      readonly externalClubTeams: ExternalClubTeamReaderPort;
      readonly encounterWindow: EncounterWindowReaderPort;
      readonly associateEncounterCandidates: Pick<AssociateEncounterCandidatesUseCase, "execute">;
    },
  ) {}

  async complete(
    input: Parameters<ProviderSyncCompletionPort["complete"]>[0],
  ): Promise<Result<void, AssociateEncounterCandidatesError>> {
    const { job } = input;
    const organizationId = asOrganizationId(job.organizationId);
    const teamIds = await this.deps.externalClubTeams.listTeamIds({
      organizationId,
      providerKey: job.providerKey,
      externalClubId: job.sync.externalClubId,
      gameEdition: job.sync.gameEdition,
      platform: job.sync.platform,
    });
    if (teamIds.length === 0) return ok(undefined);
    const focalTeamIds = new Set(teamIds);
    const opposingTeams = new Map<string, ReadonlySet<TeamId>>();

    const encounters = new Map<
      string,
      Awaited<ReturnType<EncounterWindowReaderPort["listByOrganizationTeamsAndWindow"]>>[number]
    >();
    for (const match of input.matches) {
      if (!belongsToSync(match, job)) continue;
      const opposingClubId =
        match.home.externalClubId === job.sync.externalClubId
          ? match.away.externalClubId
          : match.home.externalClubId;
      let opposingTeamIds = opposingTeams.get(opposingClubId);
      if (!opposingTeamIds) {
        opposingTeamIds = new Set(
          await this.deps.externalClubTeams.listTeamIds({
            organizationId,
            providerKey: job.providerKey,
            externalClubId: opposingClubId,
            gameEdition: job.sync.gameEdition,
            platform: job.sync.platform,
          }),
        );
        opposingTeams.set(opposingClubId, opposingTeamIds);
      }
      if (opposingTeamIds.size === 0) continue;
      const window = candidateWindowFor(match.occurredAt);
      const affected = await this.deps.encounterWindow.listByOrganizationTeamsAndWindow({
        organizationId,
        teamIds: [...teamIds, ...opposingTeamIds],
        from: window.from,
        to: window.to,
      });
      for (const encounter of affected) {
        if (isBetweenTeams(encounter, focalTeamIds, opposingTeamIds)) {
          encounters.set(encounter.encounterId, encounter);
        }
      }
    }

    for (const encounter of encounters.values()) {
      const associated = await this.deps.associateEncounterCandidates.execute({
        organizationId,
        encounterId: encounter.encounterId,
      });
      if (!associated.isOk()) return err(associated.error);
    }
    return ok(undefined);
  }
}

function isBetweenTeams(
  encounter: Awaited<
    ReturnType<EncounterWindowReaderPort["listByOrganizationTeamsAndWindow"]>
  >[number],
  focalTeamIds: ReadonlySet<TeamId>,
  opposingTeamIds: ReadonlySet<TeamId>,
): boolean {
  return (
    (focalTeamIds.has(encounter.homeTeamId) && opposingTeamIds.has(encounter.awayTeamId)) ||
    (focalTeamIds.has(encounter.awayTeamId) && opposingTeamIds.has(encounter.homeTeamId))
  );
}

function belongsToSync(
  match: Parameters<ProviderSyncCompletionPort["complete"]>[0]["matches"][number],
  job: Parameters<ProviderSyncCompletionPort["complete"]>[0]["job"],
): boolean {
  return (
    match.provider.key === job.providerKey &&
    match.game.edition === job.sync.gameEdition &&
    match.game.platform === job.sync.platform &&
    (match.home.externalClubId === job.sync.externalClubId ||
      match.away.externalClubId === job.sync.externalClubId)
  );
}
