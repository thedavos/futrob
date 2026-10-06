import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { asActorId, asTeamId } from "@futrob/shared-kernel";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import {
  seedComposition,
  HOME_CAPTAIN,
  ORG,
  ENCOUNTER,
  SECOND_ENCOUNTER,
} from "@/di/official-selection.composition.fixture.ts";
import {
  createIsolatedSchema,
  MIGRATIONS_DIRECTORY,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("0051 deadline upgrade retains immutable legacy history", () => {
  let isolated: IsolatedSchema | undefined;
  let directory: string | undefined;
  afterAll(async () => {
    await isolated?.drop();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("backfills original 24h deadlines; only the overdue legacy proposal expires after replay/restart", async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "confirmation_upgrade");
    directory = await mkdtemp(resolve(tmpdir(), "futrob-130-predeadline-"));
    for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
      if (file.endsWith(".sql") && Number.parseInt(file.slice(0, 4), 10) <= 49)
        await copyFile(resolve(MIGRATIONS_DIRECTORY, file), resolve(directory, file));
    }
    const previous = await migrateIsolatedSchema(isolated.pool, directory);
    expect(previous.applied.at(-1)).toBe("0049_provider_sync_ingestion_checkpoint.sql");
    const clock = {
      value: new Date("2026-10-04T20:00:00.000Z"),
      now() {
        return this.value;
      },
    };
    const matches = new PostgresProviderMatchRepository(isolated.pool);
    const { modules } = await seedComposition({
      pool: isolated.pool,
      matches,
      clock,
      resultsSystemActorId: "legacy-system",
    });
    await seedActors(isolated.pool, "legacy-system");
    for (const [encounterId, sequence, createdAt, reference] of [
      [ENCOUNTER, 1, "2026-10-03T20:00:00.000Z", "m-1"],
      [SECOND_ENCOUNTER, 2, "2026-10-04T15:00:00.000Z", "m-2"],
    ] as const) {
      const selection = `legacy-selection-${sequence}`;
      const proposal = `legacy-proposal-${sequence}`;
      await isolated.pool.query(
        `INSERT INTO official_match_selections
        (id, encounter_id, organization_id, competition_id, status, version, round, current_proposal_id, created_at, updated_at)
        VALUES ($1, $2, $3, 'comp-selection', 'awaiting_opponent_confirmation', 1, 1, $4, $5, $5)`,
        [selection, encounterId, ORG, proposal, createdAt],
      );
      await isolated.pool.query(
        `INSERT INTO official_selection_proposals
        (id, selection_id, organization_id, competition_id, encounter_id, round, sequence, proposing_team_id, proposed_by_actor_id, slots, created_at)
        VALUES ($1, $2, $3, 'comp-selection', $4, 1, 1, 'team-home', $5, $6::jsonb, $7)`,
        [
          proposal,
          selection,
          ORG,
          encounterId,
          HOME_CAPTAIN,
          JSON.stringify([
            {
              officialSlot: 1,
              providerMatchRef: { providerKey: "ea-clubs", externalId: reference },
            },
          ]),
          createdAt,
        ],
      );
      await isolated.pool.query(
        `INSERT INTO official_selection_actions
        (id, selection_id, proposal_id, organization_id, competition_id, encounter_id, action_type,
         from_status, to_status, version_before, version_after, actor_id, team_id, capacity, occurred_at)
        VALUES ($1, $2, $3, $4, 'comp-selection', $5, 'proposed', NULL, 'awaiting_opponent_confirmation', 0, 1, $6, 'team-home', 'team', $7)`,
        [
          `legacy-action-${sequence}`,
          selection,
          proposal,
          ORG,
          encounterId,
          HOME_CAPTAIN,
          createdAt,
        ],
      );
      await isolated.pool.query(
        `INSERT INTO official_selection_reference_claims
        (id, provider_key, external_match_id, selection_id, organization_id, competition_id, encounter_id, claimed_by_proposal_id, claimed_at)
        VALUES ($1, 'ea-clubs', $2, $3, $4, 'comp-selection', $5, $6, $7)`,
        [`legacy-claim-${sequence}`, reference, selection, ORG, encounterId, proposal, createdAt],
      );
    }
    const history = async () => ({
      proposals: (
        await isolated!.pool.query("SELECT * FROM official_selection_proposals ORDER BY id")
      ).rows,
      actions: (await isolated!.pool.query("SELECT * FROM official_selection_actions ORDER BY seq"))
        .rows,
      claims: (
        await isolated!.pool.query("SELECT * FROM official_selection_reference_claims ORDER BY id")
      ).rows,
    });
    const before = await history();
    const upgrade = await migrateIsolatedSchema(isolated.pool);
    expect(upgrade.applied).toContain("0051_official_selection_confirmation_deadlines.sql");
    expect(await history()).toEqual(before);
    const deadlines = (
      await isolated.pool.query(
        "SELECT proposal_id, confirmation_deadline FROM official_selection_confirmation_windows ORDER BY proposal_id",
      )
    ).rows;
    expect(deadlines).toEqual([
      {
        proposal_id: "legacy-proposal-1",
        confirmation_deadline: new Date("2026-10-04T20:00:00.000Z"),
      },
      {
        proposal_id: "legacy-proposal-2",
        confirmation_deadline: new Date("2026-10-05T15:00:00.000Z"),
      },
    ]);
    expect((await migrateIsolatedSchema(isolated.pool)).applied).toEqual([]);
    expect(
      (
        await isolated.pool.query(
          "SELECT proposal_id, confirmation_deadline FROM official_selection_confirmation_windows ORDER BY proposal_id",
        )
      ).rows,
    ).toEqual(deadlines);
    await expect(
      isolated.pool.query(
        "UPDATE official_selection_confirmation_windows SET confirmation_deadline = confirmation_deadline + interval '1 hour'",
      ),
    ).rejects.toMatchObject({ code: "23001" });
    const recovered = await modules.runConfirmationExpiry.execute();
    const replay = await modules.runConfirmationExpiry.execute();
    expect(recovered.isOk() ? recovered.value : recovered.error.code).toEqual({
      expired: 1,
      skipped: 0,
    });
    expect(replay.isOk() ? replay.value : replay.error.code).toEqual({ expired: 0, skipped: 0 });
    expect((await modules.results.selections.findLatestByEncounter(ENCOUNTER))?.status).toBe(
      "organizer_review",
    );
    expect((await modules.results.selections.findLatestByEncounter(SECOND_ENCOUNTER))?.status).toBe(
      "awaiting_opponent_confirmation",
    );
    const after = await history();
    expect(after.proposals).toEqual(before.proposals);
    expect(after.actions.slice(0, 2)).toEqual(before.actions);
    expect(after.actions.slice(2)).toMatchObject([
      {
        proposal_id: "legacy-proposal-1",
        actor_id: "legacy-system",
        capacity: "system",
        action_type: "confirmation_expired",
        occurred_at: new Date("2026-10-04T20:00:00.000Z"),
      },
    ]);
    expect(after.claims).toEqual(before.claims);
    const view = await modules.officialSelection.get.execute({
      actorId: asActorId("actor-away-captain"),
      actingTeamId: asTeamId("team-away"),
      organizationId: ORG,
      encounterId: ENCOUNTER,
    });
    expect(view.isOk() ? view.value.selection?.status : view.error.code).toBe("organizer_review");
    expect(await modules.results.results.listByEncounter(ENCOUNTER)).toEqual([]);
  }, 180_000);
});
