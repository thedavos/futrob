import { CANDIDATE_WINDOW_HALF_HOURS } from "@futrob/results";
import type { DueProviderSyncTarget, DueProviderSyncTargetFeed } from "@futrob/game-data";
import type { OfficialMatchStatus } from "@futrob/scheduling";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

/** EA Clubs modes that can fill an official slot. The competition does not store the mode. */
export const DUE_PROVIDER_SYNC_MATCH_TYPES = [
  "leagueMatch",
  "playoffMatch",
  "friendlyMatch",
] as const;

/** Same page size as the recent-matches read, so a sync sees the list an organizer would. */
export const DUE_PROVIDER_SYNC_MAX_RESULT_COUNT = 50;

const HALF_WINDOW_MS = CANDIDATE_WINDOW_HALF_HOURS * 60 * 60 * 1000;
const SQL_SLOT_LIMIT = 1000;

function isOpenSlotStatus(status: string): status is OfficialMatchStatus {
  return status === "scheduled" || status === "awaiting_selection";
}

export interface DueProviderSyncSlot {
  readonly organizationId: string;
  readonly providerKey: string;
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly status: string;
  readonly scheduledStartAt: Date;
}

export function dueProviderSyncTargetsFromSlots(input: {
  readonly now: Date;
  readonly slots: readonly DueProviderSyncSlot[];
  readonly limit: number;
}): readonly DueProviderSyncTarget[] {
  const groups = new Map<
    string,
    { readonly slot: DueProviderSyncSlot; readonly distanceMs: number }
  >();
  for (const slot of input.slots) {
    if (slot.providerKey !== "ea-clubs") continue;
    if (!isOpenSlotStatus(slot.status)) continue;
    const externalClubId = slot.externalClubId.trim();
    const platform = slot.platform.trim();
    const gameEdition = slot.gameEdition.trim();
    if (!externalClubId || !platform || !gameEdition) continue;
    const distanceMs = Math.abs(slot.scheduledStartAt.getTime() - input.now.getTime());
    if (distanceMs > HALF_WINDOW_MS) continue;
    const key = [
      slot.organizationId,
      externalClubId,
      platform.toLowerCase(),
      gameEdition.toLowerCase(),
    ].join(":");
    const current = groups.get(key);
    if (!current || distanceMs < current.distanceMs) {
      groups.set(key, {
        distanceMs,
        slot: { ...slot, externalClubId, platform, gameEdition },
      });
    }
  }

  const ordered = [...groups.values()].sort((left, right) => {
    const byDistance = left.distanceMs - right.distanceMs;
    if (byDistance !== 0) return byDistance;
    const byOrg = left.slot.organizationId.localeCompare(right.slot.organizationId);
    if (byOrg !== 0) return byOrg;
    return left.slot.externalClubId.localeCompare(right.slot.externalClubId);
  });

  const targets: DueProviderSyncTarget[] = [];
  for (const group of ordered) {
    for (const matchType of DUE_PROVIDER_SYNC_MATCH_TYPES) {
      targets.push({
        organizationId: group.slot.organizationId,
        providerKey: "ea-clubs",
        externalClubId: group.slot.externalClubId,
        platform: group.slot.platform,
        gameEdition: group.slot.gameEdition,
        matchType,
        maxResultCount: DUE_PROVIDER_SYNC_MAX_RESULT_COUNT,
      });
      if (targets.length >= input.limit) return targets;
    }
  }
  return targets;
}

const slotRowSchema = z.object({
  organization_id: pgTextSchema,
  provider_key: pgTextSchema,
  external_club_id: pgTextSchema,
  platform: pgTextSchema,
  game_edition: pgTextSchema,
  status: pgTextSchema,
  scheduled_start_at: pgTimestampSchema,
});

export function dueProviderSyncTargetFeedFromSlots(
  readSlots: () => readonly DueProviderSyncSlot[],
): DueProviderSyncTargetFeed {
  return {
    list(input) {
      return Promise.resolve(
        dueProviderSyncTargetsFromSlots({
          now: input.now,
          slots: readSlots(),
          limit: input.limit,
        }),
      );
    },
  };
}

export class PostgresDueProviderSyncTargetFeed implements DueProviderSyncTargetFeed {
  constructor(private readonly pool: Pool) {}

  async list(input: {
    readonly now: Date;
    readonly limit: number;
  }): Promise<readonly DueProviderSyncTarget[]> {
    const from = new Date(input.now.getTime() - HALF_WINDOW_MS);
    const to = new Date(input.now.getTime() + HALF_WINDOW_MS);
    const result = await getPgExecutor(this.pool).query(
      `SELECT match.organization_id, connection.provider_key, connection.external_club_id,
              connection.platform, connection.game_edition, match.status, match.scheduled_start_at
       FROM official_matches AS match
       INNER JOIN encounter_schedule_snapshots AS encounter
         ON encounter.encounter_id = match.encounter_id
        AND encounter.organization_id = match.organization_id
       INNER JOIN teams AS team
         ON team.organization_id = match.organization_id
        AND (team.id = encounter.home_team_id OR team.id = encounter.away_team_id)
       INNER JOIN team_external_club_connections AS connection
         ON connection.team_id = team.id
       WHERE match.status IN ('scheduled', 'awaiting_selection')
         AND connection.provider_key = 'ea-clubs'
         AND match.scheduled_start_at >= $1
         AND match.scheduled_start_at <= $2
       ORDER BY match.scheduled_start_at ASC
       LIMIT $3`,
      [from.toISOString(), to.toISOString(), SQL_SLOT_LIMIT],
    );
    const slots = result.rows.map((row) => {
      const parsed = slotRowSchema.parse(row);
      return {
        organizationId: parsed.organization_id,
        providerKey: parsed.provider_key,
        externalClubId: parsed.external_club_id,
        platform: parsed.platform,
        gameEdition: parsed.game_edition,
        status: parsed.status,
        scheduledStartAt: parsed.scheduled_start_at,
      };
    });
    return dueProviderSyncTargetsFromSlots({ now: input.now, slots, limit: input.limit });
  }
}
