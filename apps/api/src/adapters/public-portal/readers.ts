import type {
  CompetitionDiscoveryReader,
  CompetitionEntryRepository,
  CompetitionRepository,
} from "@futrob/competitions";
import type { OrganizationRepository } from "@futrob/organizations";
import type {
  PublicBracketReaderPort,
  PublicBracketSource,
  PublicBracketSourceSide,
  PublicBracketSourceStage,
  PublicCalendarReaderPort,
  PublicCalendarSourceEntry,
  PublicCompetitionKey,
  PublicCompetitionScope,
  PublicCompetitionSource,
  PublicMatchScore,
  PublicPlayerDirectoryPort,
  PublicRankingKind,
  PublicRankingSource,
  PublicRankingsReaderPort,
  PublicRulesReaderPort,
  PublicRulesSource,
  PublicStandingsReaderPort,
  PublicStandingsSource,
  PublicTeamDirectoryPort,
  PublishedCompetitionReaderPort,
} from "@futrob/public-portal";
import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import type { FixtureParticipantSlot, FixturePlan, FixturePlanRepository } from "@futrob/scheduling";
import { asCompetitionId, type EncounterId, type TeamId } from "@futrob/shared-kernel";
import {
  applySwissStandings,
  type CompetitionStandingSnapshotRepository,
  type CompetitionSwissStandingReaderPort,
  type RankingSnapshotRepository,
} from "@futrob/statistics";
import type {
  CompetitionRosterMembershipRepository,
  PlayerGameAccountRepository,
  TeamRepository,
} from "@futrob/teams";
import { pairedEncounters } from "@/application/scheduling/paired-encounters.ts";

/**
 * Resolves `/{organizationSlug}/{competition}` (ADR-0024). The organization slug scopes the
 * lookup; today the competition part IS the competition id. That identity lives only here: a
 * per-competition slug or short code later changes this adapter and nothing above it.
 */
export class OrganizationScopedPublishedCompetitionReader implements PublishedCompetitionReaderPort {
  constructor(
    private readonly organizations: Pick<OrganizationRepository, "getBySlug">,
    private readonly discovery: Pick<CompetitionDiscoveryReader, "findById">,
  ) {}

  async findByKey(key: PublicCompetitionKey): Promise<PublicCompetitionSource | null> {
    const organization = await this.organizations.getBySlug(key.organizationSlug);
    if (!organization) return null;
    const record = await this.discovery.findById(asCompetitionId(key.competition));
    // Another organization's competition under this slug is as unknown as a missing one.
    if (!record || record.competition.organizationId !== organization.id) return null;
    const { competition } = record;
    return {
      scope: {
        competitionId: competition.id,
        organizationId: competition.organizationId,
      },
      name: competition.name,
      status: competition.status,
      format: competition.format,
      platform: competition.platform,
      gameEdition: competition.gameEdition,
      region: competition.region,
      timeZone: competition.timeZone,
      startsOn: competition.schedule.startsOn,
      endsOn: competition.schedule.endsOn,
      cover: competition.cover,
      approvedTeamCount: record.approvedTeamCount,
    };
  }
}

export class StatisticsPublicStandingsReader implements PublicStandingsReaderPort {
  constructor(
    private readonly standings: CompetitionStandingSnapshotRepository,
    private readonly swissStandings: CompetitionSwissStandingReaderPort,
  ) {}

  async read(scope: PublicCompetitionScope): Promise<PublicStandingsSource | null> {
    const snapshot = await this.standings.findByCompetition(scope.competitionId);
    // The snapshot is keyed by competition alone; a mismatched tenant is treated as absent.
    if (!snapshot || snapshot.organizationId !== scope.organizationId) return null;
    const context = await this.swissStandings.find(scope.organizationId, scope.competitionId);
    const applied = context ? applySwissStandings(snapshot, context) : null;
    return {
      swiss: applied?.swiss ?? null,
      rows: (applied ?? snapshot).rows.map((row) => ({
        position: row.position,
        teamId: row.teamId,
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points,
        form: row.form,
        swiss: row.swiss,
      })),
      updatedAt: snapshot.updatedAt,
    };
  }
}

export class SchedulingPublicCalendarReader implements PublicCalendarReaderPort {
  constructor(
    private readonly fixturePlans: Pick<FixturePlanRepository, "listActive">,
    private readonly officialResults: Pick<OfficialResultReaderPort, "listByCompetition">,
  ) {}

  async list(scope: PublicCompetitionScope): Promise<readonly PublicCalendarSourceEntry[]> {
    const [plans, results] = await Promise.all([
      this.fixturePlans.listActive(scope.organizationId, scope.competitionId),
      this.officialResults.listByCompetition(scope.competitionId, scope.organizationId),
    ]);
    const scores = approvedScores(results);
    return plans
      .flatMap(pairedEncounters)
      .map(({ encounter, homeTeamId, awayTeamId, roundNumber }) => ({
        roundNumber,
        scheduledStartAt: encounter.scheduledStartAt,
        homeTeamId,
        awayTeamId,
        officialScore: scores.get(encounter.id) ?? null,
      }));
  }
}

export class TeamsPublicTeamDirectory implements PublicTeamDirectoryPort {
  constructor(
    private readonly teams: Pick<TeamRepository, "findById">,
    private readonly entries: Pick<CompetitionEntryRepository, "listByCompetition">,
  ) {}

  async listParticipantNames(scope: PublicCompetitionScope): Promise<readonly string[]> {
    const entries =
      (await this.entries.listByCompetition?.(scope.organizationId, scope.competitionId)) ?? [];
    const names = await this.namesByIds(
      scope,
      entries.filter((entry) => entry.status === "approved").map((entry) => entry.teamId),
    );
    return [...names.values()];
  }

  async namesByIds(
    scope: PublicCompetitionScope,
    teamIds: readonly TeamId[],
  ): Promise<ReadonlyMap<TeamId, string>> {
    const unique = [...new Set(teamIds)];
    const teams = await Promise.all(
      unique.map((teamId) => this.teams.findById(scope.organizationId, teamId)),
    );
    return new Map(
      teams.flatMap((team): [TeamId, string][] => (team ? [[team.id, team.name]] : [])),
    );
  }
}

/**
 * Latest approved revision of each Encounter's OfficialResult, reduced to goals per slot. The
 * snapshot's home side is the Encounter's home Team, so the goals are already home-oriented.
 */
function approvedScores(
  results: readonly OfficialResult[],
): ReadonlyMap<EncounterId, readonly PublicMatchScore[]> {
  const latest = new Map<EncounterId, OfficialResult>();
  for (const result of results) {
    if (result.status !== "approved") continue;
    const current = latest.get(result.encounterId);
    if (current && current.revision > result.revision) continue;
    latest.set(result.encounterId, result);
  }
  return new Map(
    [...latest].map(([encounterId, result]) => [
      encounterId,
      [...result.slots]
        .sort((a, b) => a.officialSlot - b.officialSlot)
        .map((slot) => ({ homeGoals: slot.homeGoals, awayGoals: slot.awayGoals })),
    ]),
  );
}

/** Knockout and playoff stages of the active fixture, with Encounter ids turned into positions. */
export class SchedulingPublicBracketReader implements PublicBracketReaderPort {
  constructor(
    private readonly fixturePlans: Pick<FixturePlanRepository, "listActive">,
    private readonly officialResults: Pick<OfficialResultReaderPort, "listByCompetition">,
  ) {}

  async read(scope: PublicCompetitionScope): Promise<PublicBracketSource | null> {
    const [plans, results] = await Promise.all([
      this.fixturePlans.listActive(scope.organizationId, scope.competitionId),
      this.officialResults.listByCompetition(scope.competitionId, scope.organizationId),
    ]);
    const plan = plans[0];
    if (!plan) return null;
    const scores = approvedScores(results);
    return { timeZone: plan.timeZone, stages: bracketStages(plan, scores) };
  }
}

function bracketStages(
  plan: FixturePlan,
  scores: ReadonlyMap<EncounterId, readonly PublicMatchScore[]>,
): PublicBracketSourceStage[] {
  const stages = [...plan.stages]
    .sort((a, b) => a.order - b.order)
    .flatMap((stage) =>
      stage.kind === "knockout" || stage.kind === "playoffs" ? [{ ...stage, kind: stage.kind }] : [],
    );
  const positions = new Map<EncounterId, { roundNumber: number; order: number }>();
  for (const stage of stages) {
    for (const round of stage.rounds) {
      for (const encounter of round.encounters) {
        positions.set(encounter.id, { roundNumber: round.number, order: encounter.order });
      }
    }
  }
  const side = (slot: FixtureParticipantSlot): PublicBracketSourceSide => {
    switch (slot.kind) {
      case "team":
        return { kind: "team", teamId: slot.teamId };
      case "bye":
        return { kind: "bye" };
      case "winner":
        return { kind: "winner", from: positions.get(slot.encounterId) ?? null };
      case "group-rank":
        return { kind: "group_rank", groupId: slot.groupId, rank: slot.rank };
      case "stage-rank":
        return { kind: "stage_rank", rank: slot.rank };
      default: {
        const exhaustive: never = slot;
        return exhaustive;
      }
    }
  };
  return stages.map((stage) => ({
    kind: stage.kind,
    rounds: stage.rounds.map((round) => ({
      number: round.number,
      scheduledStartAt: round.scheduledStartAt,
      encounters: round.encounters.map((encounter) => ({
        order: encounter.order,
        scheduledStartAt: encounter.scheduledStartAt,
        officialMatchCount: encounter.officialMatchCount,
        home: side(encounter.home),
        away: side(encounter.away),
        closedWithoutResult: encounter.closedWithoutResult === true,
        officialScore: scores.get(encounter.id) ?? null,
      })),
    })),
  }));
}

export class CompetitionsPublicRulesReader implements PublicRulesReaderPort {
  constructor(private readonly competitions: Pick<CompetitionRepository, "findById">) {}

  async read(scope: PublicCompetitionScope): Promise<PublicRulesSource | null> {
    const draft = await this.competitions.findById(scope.organizationId, scope.competitionId);
    if (!draft) return null;
    return {
      teams: { min: draft.competition.teams.min, max: draft.competition.teams.max },
      regularStage: draft.rules.regularStage,
      knockoutStage: draft.rules.knockoutStage,
      maxRosterSize: draft.rules.maxRosterSize,
    };
  }
}

export class StatisticsPublicRankingsReader implements PublicRankingsReaderPort {
  constructor(private readonly rankings: Pick<RankingSnapshotRepository, "findByCompetitionAndKind">) {}

  async read(
    scope: PublicCompetitionScope,
    kind: PublicRankingKind,
  ): Promise<PublicRankingSource | null> {
    const snapshot = await this.rankings.findByCompetitionAndKind(scope.competitionId, kind);
    // The snapshot is keyed by competition alone; a mismatched tenant is treated as absent.
    if (!snapshot || snapshot.organizationId !== scope.organizationId) return null;
    return {
      updatedAt: snapshot.updatedAt,
      rows: snapshot.rows.map((row) => ({
        position: row.position,
        playerProfileId: row.playerProfileId,
        teamId: row.teamId,
        value: row.value,
        matchesPlayed: row.matchesPlayed,
      })),
    };
  }
}

/** A player's public name is the game account declared on their roster in this competition. */
export class RosterPublicPlayerDirectory implements PublicPlayerDirectoryPort {
  constructor(
    private readonly rosters: Pick<
      CompetitionRosterMembershipRepository,
      "findByTeamPlayerCompetition" | "findByPlayerAndCompetition"
    >,
    private readonly accounts: Pick<PlayerGameAccountRepository, "findById">,
  ) {}

  async namesOf(
    scope: PublicCompetitionScope,
    players: readonly { readonly playerProfileId: string; readonly teamId: TeamId | null }[],
  ): Promise<ReadonlyMap<string, string>> {
    const named = await Promise.all(
      players.map(async ({ playerProfileId, teamId }): Promise<[string, string][]> => {
        const membership = teamId
          ? await this.rosters.findByTeamPlayerCompetition(
              teamId,
              playerProfileId,
              scope.competitionId,
            )
          : await this.rosters.findByPlayerAndCompetition(playerProfileId, scope.competitionId);
        if (!membership?.gameAccountId || membership.organizationId !== scope.organizationId) {
          return [];
        }
        const account = await this.accounts.findById(membership.gameAccountId);
        return account ? [[playerProfileId, account.identifier]] : [];
      }),
    );
    return new Map(named.flat());
  }
}
