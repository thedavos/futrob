import { createHash } from "node:crypto";
import type { CompetitionEntryRepository, CompetitionRepository } from "@futrob/competitions";
import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import {
  TeamPerformanceScopeInvalid,
  type TeamMatchContributionRepository,
  type TeamPerformanceContribution,
  type TeamPerformanceScope,
  type TeamPerformanceSourcePort,
  type TeamPerformanceSources,
} from "@futrob/statistics";

export class OfficialTeamPerformanceSource implements TeamPerformanceSourcePort {
  constructor(
    private readonly deps: {
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly entries: CompetitionEntryRepository;
      readonly results: OfficialResultReaderPort;
      readonly contributions: TeamMatchContributionRepository;
    },
  ) {}

  async validateScope(scope: TeamPerformanceScope): Promise<void> {
    if (!(await this.deps.competitions.findById(scope.organizationId, scope.competitionId))) {
      throw new TeamPerformanceScopeInvalid({
        code: "statistics.team_performance_scope_invalid",
        message: "Competition does not belong to the organization.",
      });
    }
  }

  async read(scope: TeamPerformanceScope): Promise<TeamPerformanceSources> {
    await this.validateScope(scope);
    const entries = await this.deps.entries.listByCompetition?.(
      scope.organizationId,
      scope.competitionId,
    );
    if (!entries)
      throw new TeamPerformanceScopeInvalid({
        code: "statistics.team_performance_scope_invalid",
        message: "Competition participants cannot be read.",
      });
    const results = await this.deps.results.listByCompetition(
      scope.competitionId,
      scope.organizationId,
    );
    const stored = await this.deps.contributions.listByCompetition(
      scope.competitionId,
      scope.organizationId,
    );
    const latest = new Map<string, OfficialResult>();
    for (const result of results) {
      const previous = latest.get(result.encounterId);
      if (!previous || result.revision > previous.revision) latest.set(result.encounterId, result);
    }
    const revisions = [...latest.values()].sort((a, b) => compare(a.encounterId, b.encounterId));
    const contributions: TeamPerformanceContribution[] = [];
    let projectionComplete = true;
    for (const result of revisions) {
      if (result.status !== "approved") continue;
      for (const slot of result.slots) {
        const pair = stored.filter(
          (row) =>
            row.officialResultId === result.id &&
            row.revision === result.revision &&
            row.officialSlot === slot.officialSlot &&
            row.encounterId === result.encounterId,
        );
        if (
          pair.length !== 2 ||
          !pair.some((row) => row.side === "home") ||
          !pair.some((row) => row.side === "away") ||
          !Number.isFinite(slot.occurredAt.getTime())
        ) {
          projectionComplete = false;
          continue;
        }
        for (const row of pair) {
          const expectedFor = row.side === "home" ? slot.homeGoals : slot.awayGoals;
          const expectedAgainst = row.side === "home" ? slot.awayGoals : slot.homeGoals;
          if (
            row.organizationId !== scope.organizationId ||
            row.competitionId !== scope.competitionId ||
            row.goalsFor !== expectedFor ||
            row.goalsAgainst !== expectedAgainst ||
            !Number.isSafeInteger(expectedFor) ||
            expectedFor < 0 ||
            !Number.isSafeInteger(expectedAgainst) ||
            expectedAgainst < 0
          ) {
            projectionComplete = false;
            continue;
          }
          contributions.push({ ...row, occurredAt: slot.occurredAt });
        }
      }
    }
    contributions.sort((a, b) => compare(a.id, b.id));
    const teamIds = [
      ...new Set(
        entries.filter((entry) => entry.status === "approved").map((entry) => entry.teamId),
      ),
    ].sort(compare);
    // Canonical, explicit derivation inputs: no raw provider payload, no approval/host time.
    // Include voids, every latest revision, participant set and every relevant contribution.
    const material = {
      organizationId: scope.organizationId,
      competitionId: scope.competitionId,
      teamIds,
      revisions: revisions.map((result) => ({
        id: result.id,
        encounterId: result.encounterId,
        revision: result.revision,
        status: result.status,
        slots: [...result.slots]
          .sort((a, b) => a.officialSlot - b.officialSlot)
          .map((slot) => ({
            slot: slot.officialSlot,
            occurredAt: Number.isFinite(slot.occurredAt.getTime())
              ? slot.occurredAt.toISOString()
              : null,
            homeGoals: slot.homeGoals,
            awayGoals: slot.awayGoals,
            provider: slot.providerMatchRef,
          })),
      })),
      contributions: contributions.map((row) => ({
        id: row.id,
        result: row.officialResultId,
        revision: row.revision,
        encounter: row.encounterId,
        slot: row.officialSlot,
        mode: row.resolutionMode,
        team: row.teamId,
        correlation: row.correlationStatus,
        side: row.side,
        occurredAt: row.occurredAt.toISOString(),
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        shots: row.shots,
      })),
      projectionComplete,
    };
    return {
      ...scope,
      teamIds,
      contributions,
      revisions: revisions.map((result) => ({
        officialResultId: result.id,
        encounterId: result.encounterId,
        revision: result.revision,
        status: result.status,
      })),
      revisionFingerprint: createHash("sha256").update(JSON.stringify(material)).digest("hex"),
      projectionComplete,
      unmatchedContributions: contributions.filter(
        (row) => row.teamId === null || row.correlationStatus !== "matched",
      ).length,
    };
  }
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
