import { COMPETITION_PERMISSION, type Competition } from "@futrob/competitions";
import type { OfficialResult } from "@futrob/results";
import { ENCOUNTER_PERMISSION, type FixturePlan } from "@futrob/scheduling";
import type {
  ActorId,
  AuthorizationBatchPort,
  AuthorizationPort,
  ClockPort,
  CompetitionId,
  EncounterId,
  OrganizationId,
  TeamId,
} from "@futrob/shared-kernel";
import { compareTime } from "@futrob/shared-kernel";
import type { Team } from "@futrob/teams";
import { pairedEncounters, type PairedEncounter } from "./paired-encounters.ts";

export type CompetitionEncounterStatus = "scheduled" | "awaiting_result" | "official";

export type CompetitionEncounter = {
  readonly encounterId: EncounterId;
  readonly round: { readonly number: number; readonly total: number | null };
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly home: { readonly teamId: TeamId; readonly name: string };
  readonly away: { readonly teamId: TeamId; readonly name: string };
  readonly status: CompetitionEncounterStatus;
};

export type CompetitionEncounters = {
  readonly competition: {
    readonly id: CompetitionId;
    readonly name: string;
    readonly timeZone: string;
  };
  readonly encounters: readonly CompetitionEncounter[];
};

export type ListCompetitionEncountersDependencies = {
  readonly authorization: Pick<AuthorizationPort, "decide"> & AuthorizationBatchPort;
  readonly clock: ClockPort;
  readonly competitions: {
    findById(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<{ readonly competition: Competition } | null>;
  };
  readonly fixturePlans: {
    listActive(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<FixturePlan[]>;
  };
  readonly teams: {
    findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null>;
  };
  readonly officialResults: {
    listByCompetition(
      competitionId: CompetitionId,
      organizationId?: OrganizationId,
    ): Promise<readonly Pick<OfficialResult, "encounterId" | "status">[]>;
  };
};

/**
 * The Encounters of the competition's active fixture with both Teams known that the
 * actor may read. Every Encounter is decided on its own scope, so a specific deny
 * hides it even from staff, in one batched decision. Null hides a missing or
 * unreadable competition.
 */
export class ListCompetitionEncountersUseCase {
  constructor(private readonly deps: ListCompetitionEncountersDependencies) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<CompetitionEncounters | null> {
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    if (!draft) return null;
    const scope = { organizationId: input.organizationId, competitionId: input.competitionId };

    const plans = await this.deps.fixturePlans.listActive(
      input.organizationId,
      input.competitionId,
    );
    const paired = plans.flatMap(pairedEncounters);
    const decisions = await this.deps.authorization.decideEach({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.read,
      scopes: paired.map((entry) => ({ ...scope, encounterId: entry.encounter.id })),
    });
    const readable = paired.filter((_, index) => decisions[index]?.allowed === true);
    if (readable.length === 0) {
      const competitionRead = await this.deps.authorization.decide({
        actorId: input.actorId,
        permission: COMPETITION_PERMISSION.read,
        scope,
      });
      if (!competitionRead.allowed) return null;
    }

    const [names, results] = await Promise.all([
      this.teamNames(input.organizationId, readable),
      this.deps.officialResults.listByCompetition(input.competitionId, input.organizationId),
    ]);
    const official = new Set(
      results.filter((result) => result.status === "approved").map((result) => result.encounterId),
    );
    const roundTotal = plans.reduce(
      (sum, plan) => sum + plan.stages.reduce((count, stage) => count + stage.rounds.length, 0),
      0,
    );
    const now = this.deps.clock.now();

    const encounters = readable.flatMap(
      ({ encounter, homeTeamId, awayTeamId, roundNumber }): CompetitionEncounter[] => {
        const home = names.get(homeTeamId);
        const away = names.get(awayTeamId);
        if (!home || !away) return [];
        return [
          {
            encounterId: encounter.id,
            round: { number: roundNumber, total: roundTotal > 0 ? roundTotal : null },
            scheduledStartAt: encounter.scheduledStartAt,
            officialMatchCount: encounter.officialMatchCount,
            home: { teamId: homeTeamId, name: home },
            away: { teamId: awayTeamId, name: away },
            status: official.has(encounter.id)
              ? "official"
              : encounter.scheduledStartAt.getTime() <= now.getTime()
                ? "awaiting_result"
                : "scheduled",
          },
        ];
      },
    );

    return {
      competition: {
        id: input.competitionId,
        name: draft.competition.name,
        timeZone: draft.competition.timeZone,
      },
      encounters: encounters.sort(
        (a, b) =>
          compareTime(a.scheduledStartAt, b.scheduledStartAt) || a.round.number - b.round.number,
      ),
    };
  }

  private async teamNames(
    organizationId: OrganizationId,
    paired: readonly PairedEncounter[],
  ): Promise<Map<TeamId, string>> {
    const ids = [...new Set(paired.flatMap((entry) => [entry.homeTeamId, entry.awayTeamId]))];
    const teams = await Promise.all(ids.map((id) => this.deps.teams.findById(organizationId, id)));
    return new Map(
      teams.flatMap((team): [TeamId, string][] => (team ? [[team.id, team.name]] : [])),
    );
  }
}
