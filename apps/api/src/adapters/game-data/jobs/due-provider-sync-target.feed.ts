import { CANDIDATE_WINDOW_HALF_HOURS } from "@futrob/results";
import {
  providerSyncDedupeKey,
  providerSyncStillCovered,
  type DueProviderSyncTarget,
  type DueProviderSyncTargetFeed,
  type ProviderSyncJobRepository,
} from "@futrob/game-data";
import { compareTime } from "@futrob/shared-kernel";
import type { OfficialMatchStatus } from "@futrob/scheduling";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema } from "@/adapters/persistence/pg-scalar.ts";
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

const targetRowSchema = z.object({
  organization_id: pgTextSchema,
  external_club_id: pgTextSchema,
  platform: pgTextSchema,
  game_edition: pgTextSchema,
  match_type: pgTextSchema,
});

export function dueProviderSyncTargetFeedFromSlots(
  readSlots: () => readonly DueProviderSyncSlot[],
  jobs: Pick<ProviderSyncJobRepository, "findLatest">,
): DueProviderSyncTargetFeed {
  return {
    async list(input) {
      const targets = dueProviderSyncTargetsFromSlots({
        now: input.now,
        slots: readSlots(),
        limit: Infinity,
      });
      const uncovered = [];
      for (const target of targets) {
        const latest = await jobs.findLatest({
          organizationId: target.organizationId,
          dedupeKey: providerSyncDedupeKey({ providerKey: target.providerKey, sync: target }),
        });
        if (providerSyncStillCovered(latest, input.now, input.cooldownMs)) continue;
        uncovered.push({
          target,
          completedAt:
            latest?.status === "succeeded" || latest?.status === "dead" ? latest.completedAt : null,
        });
      }
      uncovered.sort((left, right) => {
        if (left.completedAt === null) return right.completedAt === null ? 0 : -1;
        if (right.completedAt === null) return 1;
        return compareTime(left.completedAt, right.completedAt);
      });
      return uncovered.slice(0, input.limit).map(({ target }) => target);
    },
  };
}

export class PostgresDueProviderSyncTargetFeed implements DueProviderSyncTargetFeed {
  constructor(private readonly pool: Pool) {}

  async list(
    input: Parameters<DueProviderSyncTargetFeed["list"]>[0],
  ): Promise<readonly DueProviderSyncTarget[]> {
    const from = new Date(input.now.getTime() - HALF_WINDOW_MS);
    const to = new Date(input.now.getTime() + HALF_WINDOW_MS);
    const result = await getPgExecutor(this.pool).query(
      `WITH clubs AS (
         SELECT match.organization_id, trim(connection.external_club_id) AS external_club_id,
                lower(trim(connection.platform)) AS platform,
                lower(trim(connection.game_edition)) AS game_edition,
                min(abs(extract(epoch FROM (match.scheduled_start_at - $1::timestamptz)))) AS distance
         FROM official_matches AS match
         INNER JOIN encounter_schedule_snapshots AS encounter
           ON encounter.encounter_id = match.encounter_id
          AND encounter.organization_id = match.organization_id
         INNER JOIN teams AS team
           ON team.organization_id = match.organization_id
          AND (team.id = encounter.home_team_id OR team.id = encounter.away_team_id)
         INNER JOIN team_external_club_connections AS connection ON connection.team_id = team.id
         WHERE match.status IN ('scheduled', 'awaiting_selection')
           AND connection.provider_key = 'ea-clubs'
           AND match.scheduled_start_at >= $2 AND match.scheduled_start_at <= $3
           AND trim(connection.external_club_id) <> ''
           AND trim(connection.platform) <> '' AND trim(connection.game_edition) <> ''
         GROUP BY match.organization_id, trim(connection.external_club_id),
                  lower(trim(connection.platform)), lower(trim(connection.game_edition))
       )
       SELECT club.*, mode.match_type
       FROM clubs AS club
       CROSS JOIN unnest($4::text[]) WITH ORDINALITY AS mode(match_type, position)
       LEFT JOIN LATERAL (
         SELECT status, completed_at FROM provider_sync_jobs
         WHERE organization_id = club.organization_id
           AND dedupe_key = concat_ws(':', 'recent-matches', 'ea-clubs', club.external_club_id,
                 club.platform, club.game_edition, lower(mode.match_type), $5::text)
         ORDER BY created_at DESC, id DESC LIMIT 1
       ) AS latest ON true
       WHERE latest.status IS NULL
          OR (latest.status IN ('succeeded', 'dead') AND latest.completed_at <= $6)
       ORDER BY latest.completed_at ASC NULLS FIRST, club.distance, club.organization_id,
                club.external_club_id, club.platform, club.game_edition, mode.position
       LIMIT $7`,
      [
        input.now.toISOString(),
        from.toISOString(),
        to.toISOString(),
        [...DUE_PROVIDER_SYNC_MATCH_TYPES],
        String(DUE_PROVIDER_SYNC_MAX_RESULT_COUNT),
        new Date(input.now.getTime() - input.cooldownMs).toISOString(),
        input.limit,
      ],
    );
    return result.rows.map((row) => {
      const parsed = targetRowSchema.parse(row);
      return {
        organizationId: parsed.organization_id,
        providerKey: "ea-clubs",
        externalClubId: parsed.external_club_id,
        platform: parsed.platform,
        gameEdition: parsed.game_edition,
        matchType: parsed.match_type,
        maxResultCount: DUE_PROVIDER_SYNC_MAX_RESULT_COUNT,
      };
    });
  }
}
