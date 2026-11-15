import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { createModules } from "@/di/create-modules.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { PostgresMembershipRepository } from "@/adapters/organizations/postgres.repository.ts";
import { PostgresActorContactReader } from "./actor-contact.reader.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("member directory Postgres projection and membership", () => {
  let isolated: IsolatedSchema;
  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "members_projection");
    await migrateIsolatedSchema(isolated.pool);
  }, 60_000);
  afterAll(async () => {
    await isolated?.drop();
  });

  it("backfills the latest credential subject once, then reads only the requested actors", async () => {
    await seedActors(isolated.pool, "member-a", "member-b");
    await isolated.pool
      .query(`INSERT INTO auth_users (id, name, email, email_verified, created_at, updated_at) VALUES
      ('older', 'Old', 'older@example.test', false, NOW(), '2026-01-01'),
      ('newer', 'Latest', 'latest@example.test', false, NOW(), '2026-02-01')`);
    await isolated.pool
      .query(`INSERT INTO identity_subjects (provider, subject, actor_id, created_at) VALUES
      ('credential', 'older', 'member-a', NOW()), ('credential', 'newer', 'member-a', NOW())`);
    const migration = await readFile(
      resolve(import.meta.dirname, "../../../migrations/0056_actor_contact_profiles.sql"),
      "utf8",
    );
    await isolated.pool.query(migration);
    const reader = new PostgresActorContactReader(isolated.pool);
    expect(await reader.listByActorIds([asActorId("member-a"), asActorId("member-b")])).toEqual([
      { actorId: "member-a", displayName: "Latest", email: "latest@example.test" },
    ]);
    expect(await reader.listByActorIds([asActorId("member-b")])).toEqual([]);
  });

  it("uses a stable bounded tenant list including the overflow sentinel", async () => {
    await isolated.pool
      .query(`INSERT INTO organizations (id,name,normalized_name,slug,time_zone,created_at,created_by_actor_id)
      VALUES ('org-a','A','a','org-a','UTC',NOW(),'member-a'), ('org-b','B','b','org-b','UTC',NOW(),'member-b')`);
    await isolated.pool
      .query(`INSERT INTO organization_memberships (organization_id,actor_id,role,created_at)
      VALUES ('org-a','member-b','staff','2026-01-01'), ('org-a','member-a','organizer','2026-01-01'), ('org-b','member-b','organizer','2026-01-01')`);
    const repository = new PostgresMembershipRepository(isolated.pool);
    expect(
      (await repository.listByOrganization(asOrganizationId("org-a"), 1)).map((row) => row.actorId),
    ).toEqual(["member-a"]);
    expect(
      (await repository.listByOrganization(asOrganizationId("org-a"), 501)).map(
        (row) => row.actorId,
      ),
    ).toEqual(["member-a", "member-b"]);
    expect(
      (await repository.listByOrganization(asOrganizationId("org-b"), 501)).map(
        (row) => row.actorId,
      ),
    ).toEqual(["member-b"]);
  });
  it("composes batched Postgres competition, roster, grant and platform facts without leaking another tenant", async () => {
    await seedActors(isolated.pool, "member-c", "member-d");
    await isolated.pool.query(`
      UPDATE organization_memberships SET role='member' WHERE organization_id='org-a' AND actor_id='member-b';
      INSERT INTO organization_memberships (organization_id,actor_id,role,created_at) VALUES
        ('org-a','member-c','member',NOW()), ('org-a','member-d','member',NOW());
      INSERT INTO competitions (id,organization_id,name,status,modality,game_edition,platform,region,time_zone,format,created_by_actor_id,created_at,updated_at) VALUES
        ('comp-a','org-a','Visible A','draft','fc-clubs','fc26','playstation','south-america','UTC','league','member-a',NOW(),NOW()),
        ('comp-b','org-a','Visible B','draft','fc-clubs','fc26','playstation','south-america','UTC','league','member-a',NOW(),NOW()),
        ('foreign-comp','org-b','Private foreign','draft','fc-clubs','fc26','playstation','south-america','UTC','league','member-b',NOW(),NOW());
      INSERT INTO teams (id,organization_id,name,created_at,created_by_actor_id) VALUES ('team-a','org-a','A',NOW(),'member-a');
      INSERT INTO player_profiles (id,actor_id,created_at) VALUES ('profile-b','member-b',NOW());
      INSERT INTO competition_roster_memberships (id,organization_id,competition_id,team_id,player_profile_id,role,created_at)
        VALUES ('roster-b','org-a','comp-a','team-a','profile-b','vice_captain',NOW());
      INSERT INTO competition_memberships (organization_id,competition_id,actor_id,role,created_at)
        VALUES ('org-b','foreign-comp','member-c','staff',NOW());
      INSERT INTO authorization_grants (id,organization_id,actor_id,permission,effect,scope_type,scope_id,granted_by_actor_id,created_at,updated_at) VALUES
        ('grant-c','org-a','member-c','competitions.read','allow','competition','comp-b','member-a',NOW(),NOW()),
        ('grant-foreign','org-b','member-c','competitions.read','allow','organization','org-b','member-b',NOW(),NOW());
      INSERT INTO platform_role_assignments (actor_id,role,assigned_by_actor_id,created_at) VALUES ('member-d','superuser','member-a',NOW());
    `);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: async () => Response.json([]),
      eaClubsBaseUrl: "https://example.test",
    });
    const result = await modules.organizations.listOrganizationMembers.execute({
      actorId: asActorId("member-a"),
      organizationId: asOrganizationId("org-a"),
    });
    if (!result.isOk()) throw result.error;
    const members = new Map(result.value.members.map((member) => [member.actorId, member]));
    expect(members.get(asActorId("member-b"))?.access).toEqual({
      kind: "assigned",
      competitions: [
        { competitionId: "comp-a", name: "Visible A", read: "allowed", role: "vice_captain" },
      ],
    });
    expect(members.get(asActorId("member-c"))?.access).toEqual({
      kind: "assigned",
      competitions: [{ competitionId: "comp-b", name: "Visible B", read: "allowed", role: null }],
    });
    expect(members.get(asActorId("member-d"))?.access).toEqual({ kind: "inherited" });
    expect(JSON.stringify(result.value)).not.toContain("Private foreign");
    const privateCaller = await modules.organizations.listOrganizationMembers.execute({
      actorId: asActorId("member-b"),
      organizationId: asOrganizationId("org-a"),
    });
    expect(privateCaller.isOk()).toBe(false);
  }, 30_000);
});
