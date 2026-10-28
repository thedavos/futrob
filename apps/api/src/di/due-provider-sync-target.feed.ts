import {
  dueProviderSyncTargetFeedFromSlots,
  PostgresDueProviderSyncTargetFeed,
  type DueProviderSyncSlot,
} from "@/adapters/game-data/jobs/due-provider-sync-target.feed.ts";
import { InMemoryEncounterScheduleRepository } from "@/adapters/scheduling/encounter-schedule.repository.ts";
import { InMemoryOfficialMatchRepository } from "@/adapters/scheduling/official-match.repository.ts";
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";
import type { DueProviderSyncTargetFeed } from "@futrob/game-data";
import type { EncounterScheduleRepository, OfficialMatchRepository } from "@futrob/scheduling";
import { Panic } from "@futrob/shared-kernel";
import type { ExternalClubConnectionRepository } from "@futrob/teams";
import type { Pool } from "pg";

export function createDueProviderSyncTargetFeed(input: {
  readonly pool: Pool | undefined;
  readonly encounters: EncounterScheduleRepository;
  readonly matches: OfficialMatchRepository;
  readonly connections: ExternalClubConnectionRepository;
}): DueProviderSyncTargetFeed {
  if (input.pool) return new PostgresDueProviderSyncTargetFeed(input.pool);
  if (
    input.encounters instanceof InMemoryEncounterScheduleRepository &&
    input.matches instanceof InMemoryOfficialMatchRepository &&
    input.connections instanceof InMemoryExternalClubConnectionRepository
  ) {
    const encounters = input.encounters;
    const matches = input.matches;
    const connections = input.connections;
    return dueProviderSyncTargetFeedFromSlots(() =>
      slotsFromMemory(encounters, matches, connections),
    );
  }
  throw new Panic("Due provider sync feed has no store for this composition");
}

function slotsFromMemory(
  encounters: InMemoryEncounterScheduleRepository,
  matches: InMemoryOfficialMatchRepository,
  connections: InMemoryExternalClubConnectionRepository,
): readonly DueProviderSyncSlot[] {
  const slots: DueProviderSyncSlot[] = [];
  for (const match of matches.rows.values()) {
    const encounter = encounters.rows.get(match.encounterId);
    if (!encounter || encounter.organizationId !== match.organizationId) continue;
    for (const teamId of [encounter.homeTeamId, encounter.awayTeamId]) {
      const connection = connections.rows.get(teamId);
      if (!connection) continue;
      slots.push({
        organizationId: match.organizationId,
        providerKey: connection.providerKey,
        externalClubId: connection.externalClubId,
        platform: connection.platform,
        gameEdition: connection.gameEdition,
        status: match.status,
        scheduledStartAt: match.scheduledStartAt,
      });
    }
  }
  return slots;
}
