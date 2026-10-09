import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ListActivitiesUseCase } from "@futrob/notifications";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  MIGRATIONS_DIRECTORY,
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { PostgresActivityEntryRepository } from "./activity-entry.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const ACTIVITY_MIGRATION = "0054_activity_entries.sql";

describe.skipIf(!databaseUrl)("0054 activity entries backfill", () => {
  let isolated: IsolatedSchema;
  let before: string;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "activity_backfill");
    before = await mkdtemp(join(tmpdir(), "futrob-migrations-"));
    for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
      if (file.endsWith(".sql") && file < ACTIVITY_MIGRATION) {
        await cp(join(MIGRATIONS_DIRECTORY, file), join(before, file));
      }
    }
    await migrateIsolatedSchema(isolated.pool, before);
  }, 180_000);

  afterAll(async () => {
    await isolated?.drop();
    if (before) await rm(before, { recursive: true, force: true });
  }, 180_000);

  it("projects open disputes, pending proposals and directed invitations", async () => {
    const db = isolated.pool;
    await seedActors(db, "organizer", "captain-home", "invitee");
    await db.query(
      `INSERT INTO organizations (id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id)
       VALUES ('org-a', 'Org A', 'org a', 'org-a', 'UTC', NOW(), 'organizer')`,
    );
    await db.query(
      `INSERT INTO competitions (
         id, organization_id, name, status, modality, game_edition, platform,
         region, time_zone, format, created_by_actor_id, created_at, updated_at
       ) VALUES ('cmp-a', 'org-a', 'Liga A', 'published', 'fc-clubs', 'fc26', 'playstation',
                 'south-america', 'UTC', 'league', 'organizer', NOW(), NOW())`,
    );
    await db.query(
      `INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id) VALUES
         ('tm-home', 'org-a', 'Cuervos', NOW(), 'organizer'),
         ('tm-away', 'org-a', 'Halcones', NOW(), 'organizer')`,
    );
    for (const encounter of ["enc-1", "enc-2"]) {
      await db.query(
        `INSERT INTO encounter_schedule_snapshots (
           encounter_id, organization_id, competition_id, home_team_id, away_team_id,
           scheduled_start_at, official_match_count
         ) VALUES ($1, 'org-a', 'cmp-a', 'tm-home', 'tm-away', NOW(), 1)`,
        [encounter],
      );
    }
    await db.query(
      `INSERT INTO official_match_selections (
         id, encounter_id, organization_id, competition_id, status, version, round,
         current_proposal_id, created_at, updated_at
       ) VALUES
         ('sel-1', 'enc-1', 'org-a', 'cmp-a', 'disputed', 2, 1, 'prop-1', NOW(), NOW()),
         ('sel-2', 'enc-2', 'org-a', 'cmp-a', 'awaiting_opponent_confirmation', 1, 1, 'prop-2', NOW(), NOW())`,
    );
    await db.query(
      `INSERT INTO official_selection_proposals (
         id, selection_id, organization_id, competition_id, encounter_id, round, sequence,
         proposing_team_id, proposed_by_actor_id, slots, created_at
       ) VALUES
         ('prop-1', 'sel-1', 'org-a', 'cmp-a', 'enc-1', 1, 1, 'tm-home', 'captain-home', '[]', NOW()),
         ('prop-2', 'sel-2', 'org-a', 'cmp-a', 'enc-2', 1, 1, 'tm-home', 'captain-home', '[]',
          '2026-10-07T10:00:00.123456Z')`,
    );
    await db.query(
      `INSERT INTO official_selection_confirmation_windows (proposal_id, confirmation_deadline)
       VALUES ('prop-2', '2026-10-08T10:00:00Z')`,
    );
    await db.query(
      `INSERT INTO match_disputes (
         id, selection_id, organization_id, competition_id, encounter_id, status,
         opened_by_actor_id, opened_by_team_id, opened_reason, opened_at
       ) VALUES
         ('dsp-open', 'sel-1', 'org-a', 'cmp-a', 'enc-1', 'under_review', 'captain-home', 'tm-home', 'x', NOW()),
         ('dsp-done', 'sel-1', 'org-a', 'cmp-a', 'enc-1', 'resolved', 'captain-home', 'tm-home', 'x', NOW())`,
    );
    await db.query(
      `INSERT INTO roster_invitations (
         id, organization_id, competition_id, team_id, role, token_hash, status,
         invited_by_actor_id, expires_at, created_at, invitee_actor_id
       ) VALUES
         ('inv-directed', 'org-a', 'cmp-a', 'tm-home', 'player', 'h1', 'pending', 'captain-home',
          '2026-10-09T00:00:00Z', NOW(), 'invitee'),
         ('inv-link', 'org-a', 'cmp-a', 'tm-home', 'player', 'h2', 'pending', 'captain-home',
          '2026-10-09T00:00:00Z', NOW(), NULL)`,
    );

    await migrateIsolatedSchema(isolated.pool);

    const list = new ListActivitiesUseCase({
      activities: new PostgresActivityEntryRepository(db),
      clock: { now: () => new Date("2026-10-07T12:00:00Z") },
    });
    const organization = await list.execute({
      audiences: [{ audience: "organization", audienceId: "org-a" }],
    });
    expect(
      organization.isOk() &&
        organization.value.items.map((row) => [row.sourceId, row.requiresAction]).sort(),
    ).toEqual([
      ["dsp-open", true],
      ["inv-directed", false],
      ["prop-2", false],
    ]);
    const dispute = organization.isOk()
      ? organization.value.items.find((row) => row.sourceId === "dsp-open")
      : undefined;
    expect(dispute?.subject).toEqual({
      competitionName: "Liga A",
      encounterLabel: "Cuervos vs Halcones",
      teamName: null,
    });

    const rival = await list.execute({
      audiences: [{ audience: "team", audienceId: "tm-away" }],
      status: "open",
      requiresAction: true,
    });
    expect(rival.isOk() && rival.value.items).toMatchObject([
      {
        sourceId: "prop-2",
        subject: { teamName: "Halcones" },
        openedAt: new Date("2026-10-07T10:00:00.123Z"),
        expiresAt: new Date("2026-10-08T10:00:00Z"),
      },
    ]);

    const invitee = await list.execute({
      audiences: [{ audience: "actor", audienceId: "invitee" }],
      status: "open",
      requiresAction: true,
    });
    expect(invitee.isOk() && invitee.value.items.map((row) => row.sourceId)).toEqual([
      "inv-directed",
    ]);
  }, 60_000);
});
