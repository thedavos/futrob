import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import { externalReferenceKey } from "@futrob/game-data";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type ClockPort,
} from "@futrob/shared-kernel";
import type { EncounterCandidateAssociation } from "../domain/entities/encounter-candidate-association.ts";
import type { OfficialMatchSelection } from "../domain/entities/official-match-selection.ts";
import type { EncounterCandidateAssociationRepository } from "../domain/ports/encounter-candidate-association.repository.ts";
import {
  asEncounterStageId,
  type EncounterReaderPort,
  type EncounterScheduleSnapshot,
} from "../domain/ports/encounter-reader.port.ts";
import type { OfficialMatchSelectionRepository } from "../domain/ports/official-result.repository.ts";
import type {
  CandidateMatchReadResult,
  ProviderMatchReaderPort,
} from "../domain/ports/provider-match-reader.port.ts";

export const KICKOFF = new Date("2026-09-14T20:00:00.000Z");
export const KICKOFF_PLUS_24H = new Date("2026-09-15T20:00:00.000Z");
export const NOW = new Date("2026-09-14T21:00:00.000Z");

export function providerMatch(externalId: string, occurredAt: string): ProviderMatch {
  return {
    id: `id-${externalId}`,
    provider: { key: "ea-clubs", externalMatchId: externalId },
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date(occurredAt),
    home: {
      externalClubId: "club-home",
      name: "Home Club",
      goals: 2,
      imageUrl: null,
    },
    away: {
      externalClubId: "club-away",
      name: "Away Club",
      goals: 1,
      imageUrl: null,
    },
    players: [],
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

export function encounterSnapshot(
  overrides: Partial<EncounterScheduleSnapshot> = {},
): EncounterScheduleSnapshot {
  return {
    encounterId: asEncounterId("enc-1"),
    organizationId: asOrganizationId("org-1"),
    competitionId: asCompetitionId("competition-1"),
    stageId: asEncounterStageId("stage-1"),
    homeTeamId: asTeamId("home"),
    awayTeamId: asTeamId("away"),
    scheduledStartAt: KICKOFF,
    officialMatchCount: 1,
    homeExternalClubId: "club-home",
    awayExternalClubId: "club-away",
    providerKey: "ea-clubs",
    ...overrides,
  };
}

export class MemoryEncounterCandidateAssociations implements EncounterCandidateAssociationRepository {
  rows: EncounterCandidateAssociation[] = [];

  async replaceForEncounter(
    organizationId: EncounterCandidateAssociation["organizationId"],
    encounterId: EncounterCandidateAssociation["encounterId"],
    rows: readonly EncounterCandidateAssociation[],
  ) {
    this.rows = this.rows.filter(
      (row) => row.organizationId !== organizationId || row.encounterId !== encounterId,
    );
    this.rows.push(...rows);
    return rows;
  }

  async listByEncounter(
    organizationId: EncounterCandidateAssociation["organizationId"],
    encounterId: EncounterCandidateAssociation["encounterId"],
  ) {
    return this.rows.filter(
      (row) => row.organizationId === organizationId && row.encounterId === encounterId,
    );
  }

  async findByRef(
    organizationId: EncounterCandidateAssociation["organizationId"],
    encounterId: EncounterCandidateAssociation["encounterId"],
    providerMatchRef: ExternalReference,
  ) {
    const key = externalReferenceKey(providerMatchRef);
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.encounterId === encounterId &&
          externalReferenceKey(row.providerMatchRef) === key,
      ) ?? null
    );
  }
}

export class WindowedProviderMatchReader implements ProviderMatchReaderPort {
  constructor(private readonly matches: readonly ProviderMatch[]) {}

  async listCandidatesForEncounter(query: {
    readonly window: { readonly from: Date; readonly to: Date };
  }): Promise<CandidateMatchReadResult> {
    return {
      status: "ready",
      matches: this.matches.filter(
        (match) => match.occurredAt >= query.window.from && match.occurredAt <= query.window.to,
      ),
    };
  }

  async getByExternalRef(ref: ExternalReference): Promise<ProviderMatch | null> {
    return (
      this.matches.find(
        (match) =>
          match.provider.key === ref.providerKey &&
          match.provider.externalMatchId === ref.externalId,
      ) ?? null
    );
  }
}

export class MutableEncounterReader implements EncounterReaderPort {
  constructor(public snapshot: EncounterScheduleSnapshot | null) {}

  async getById(encounterId: EncounterScheduleSnapshot["encounterId"]) {
    if (!this.snapshot || this.snapshot.encounterId !== encounterId) return null;
    return this.snapshot;
  }
}

export class MemorySelections implements OfficialMatchSelectionRepository {
  rows: OfficialMatchSelection[] = [];

  async save(selection: OfficialMatchSelection) {
    this.rows = this.rows.filter((row) => row.id !== selection.id);
    this.rows.push(selection);
    return selection;
  }

  async findLatestByEncounter(encounterId: OfficialMatchSelection["encounterId"]) {
    return [...this.rows].reverse().find((row) => row.encounterId === encounterId) ?? null;
  }
}

export const allowAll: AuthorizationPort = {
  async decide(request) {
    return {
      allowed: true,
      permission: request.permission,
      scope: request.scope,
      reason: "allowed",
    };
  },
  async getEffectiveAccess(input) {
    return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
  },
};

export const fixedClock: ClockPort = { now: () => NOW };

export function associationIds(rows: readonly EncounterCandidateAssociation[]): string[] {
  return [...rows].map((row) => row.id).sort();
}

export function eligibleExternalIds(rows: readonly EncounterCandidateAssociation[]): string[] {
  return rows
    .filter((row) => row.eligible)
    .map((row) => row.providerMatchRef.externalId)
    .sort();
}
