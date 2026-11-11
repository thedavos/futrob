import type { EmailMessage } from "@futrob/notifications";
import { asActorId, ok } from "@futrob/shared-kernel";
import { hashPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createModules } from "@/di/create-modules.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);

const alex = asActorId("actor-alex");
const REQUESTED = new Date("2026-11-10T09:00:00.000Z");
const DEADLINE = new Date("2026-12-10T09:00:00.000Z");
const PASSWORD = "correct horse battery";
const PINNED = JSON.stringify({
  to: "alex@futrob.test",
  subject: "Hola, Alex Rivera",
  html: "<p>Hola, Alex Rivera</p>",
  text: "Hola, Alex Rivera",
  headers: {},
  idempotencyKey: "email-delivery/email-pending",
});

suite("account deletion on Postgres", () => {
  let isolated: IsolatedSchema;
  let now = REQUESTED;
  let modules: ReturnType<typeof createModules>;
  const sent: EmailMessage[] = [];

  async function count(sql: string, values: unknown[] = [alex]): Promise<number> {
    const result = await isolated.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM ${sql}`,
      values,
    );
    return Number(result.rows[0]?.n);
  }

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "account_deletion");
    await migrateIsolatedSchema(isolated.pool);
    modules = createModules({
      pool: isolated.pool,
      fetcher: async () => {
        throw new Error("EA must not be called");
      },
      eaClubsBaseUrl: "https://ea.example.test/api/fc",
      clock: { now: () => now },
      email: {
        sender: {
          send: async (message) => {
            sent.push(message);
            return ok({ providerMessageId: `msg-${sent.length}` });
          },
        },
        webBaseUrl: "https://futrob.test",
      },
    });
    await seedActors(isolated.pool, alex, "actor-bea");
    const at = REQUESTED.toISOString();
    const hash = await hashPassword(PASSWORD);
    await isolated.pool.query(
      `INSERT INTO auth_users (id, name, email, email_verified, created_at, updated_at)
         VALUES ('user-alex', 'Alex Rivera', 'alex@futrob.test', true, $1, $1);
       INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
         VALUES ('acc-alex', 'user-alex', 'credential', 'user-alex', '${hash}', $1, $1);
       INSERT INTO auth_sessions (id, expires_at, token, created_at, updated_at, user_id)
         VALUES ('s-web', $1::timestamptz + interval '7 days', 'tok-web', $1, $1, 'user-alex'),
                ('s-app', $1::timestamptz + interval '7 days', 'tok-app', $1, $1, 'user-alex');
       INSERT INTO identity_subjects (provider, subject, actor_id, created_at)
         VALUES ('credential', 'user-alex', 'actor-alex', $1);
       INSERT INTO actor_contact_profiles (actor_id, display_name, email, updated_at)
         VALUES ('actor-alex', 'Alex Rivera', 'alex@futrob.test', $1);
       INSERT INTO organizations (id, name, created_at, created_by_actor_id, normalized_name, slug, time_zone)
         VALUES ('org-1', 'Liga Norte', $1, 'actor-alex', 'liga norte', 'liga-norte', 'America/Lima');
       INSERT INTO organization_memberships (organization_id, actor_id, role, created_at)
         VALUES ('org-1', 'actor-alex', 'organizer', $1);
       INSERT INTO competitions (id, organization_id, name, status, modality, game_edition, platform,
                                 region, time_zone, format, created_by_actor_id, created_at, updated_at)
         VALUES ('comp-live', 'org-1', 'Apertura', 'published', 'fc-clubs', 'fc26', 'playstation',
                 'south-america', 'America/Lima', 'league', 'actor-alex', $1, $1),
                ('comp-done', 'org-1', 'Clausura', 'finished', 'fc-clubs', 'fc26', 'playstation',
                 'south-america', 'America/Lima', 'league', 'actor-alex', $1, $1);
       INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id)
         VALUES ('team-1', 'org-1', 'Halcones', $1, 'actor-alex');
       INSERT INTO competition_entries (id, organization_id, competition_id, team_id, status, created_at)
         VALUES ('entry-live', 'org-1', 'comp-live', 'team-1', 'approved', $1),
                ('entry-done', 'org-1', 'comp-done', 'team-1', 'approved', $1);
       INSERT INTO player_profiles (id, actor_id, created_at) VALUES ('profile-alex', 'actor-alex', $1);
       INSERT INTO player_game_accounts (id, player_profile_id, identifier, normalized_identifier,
                                         platform, game_edition, created_at)
         VALUES ('ga-alex', 'profile-alex', 'AlexR10', 'alexr10', 'playstation', 'fc26', $1);
       INSERT INTO competition_roster_memberships (id, organization_id, competition_id, team_id,
                                                   player_profile_id, game_account_id, role, created_at)
         VALUES ('roster-live', 'org-1', 'comp-live', 'team-1', 'profile-alex', 'ga-alex', 'captain', $1),
                ('roster-done', 'org-1', 'comp-done', 'team-1', 'profile-alex', 'ga-alex', 'player', $1);
       INSERT INTO player_personal_stats (player_profile_id, matches_played, minutes, totals, averages,
                                          per90, partial, source_revision_max, updated_at)
         VALUES ('profile-alex', 3, 270, '{}', '{}', '{}', '{}', 1, $1);
       INSERT INTO player_competition_stats (player_profile_id, competition_id, organization_id,
                                             matches_played, minutes, totals, averages, per90,
                                             partial, source_revision_max, updated_at)
         VALUES ('profile-alex', 'comp-done', 'org-1', 3, 270, '{}', '{}', '{}', '{}', 1, $1);
       INSERT INTO roster_invitations (id, organization_id, competition_id, team_id, role, token_hash,
                                       status, invited_by_actor_id, invited_by_display_name,
                                       invited_by_gamertag, expires_at, accepted_by_actor_id, created_at)
         VALUES ('inv-done', 'org-1', 'comp-done', 'team-1', 'player', 'hash-done', 'accepted',
                 'actor-alex', 'Alex Rivera', 'AlexR10', $1, 'actor-bea', $1);
       INSERT INTO authorization_audit_log (id, actor_id, action, target_actor_id, scope_type, scope_id, created_at)
         VALUES ('audit-1', 'actor-alex', 'grant', 'actor-bea', 'organization', 'org-1', $1);
       INSERT INTO activity_entries (id, organization_id, audience, audience_id, kind, status,
                                     requires_action, resource_type, resource_id, actor_id, opened_at,
                                     last_event_at, source_name, source_id)
         VALUES ('activity-1', 'org-1', 'actor', 'actor-alex', 'roster_invitation', 'open', true,
                 'roster_invitation', 'inv-1', 'actor-bea', $1, $1, 'roster_invitation', 'inv-1');
       INSERT INTO billing_subscriptions (id, subject_type, organization_id, plan_key, status,
                                          created_at, updated_at)
         VALUES ('sub-1', 'organization', 'org-1', 'pro', 'active', $1, $1);
       INSERT INTO notification_email_preferences (actor_id, locale, non_critical_email,
                                                   unsubscribe_token, updated_at)
         VALUES ('actor-alex', 'es', true, 'unsubscribe-token-alex-0123456789abcdef', $1);
       INSERT INTO email_outbox (id, event_id, channel, organization_id, recipient_actor_id,
                                 template, intent, status, attempts, next_attempt_at, last_error,
                                 provider_message_id, created_at, settled_at, message)
         VALUES ('email-sent', 'event-sent', 'email', 'org-1', 'actor-alex', 'sanction',
                 '{"template":"sanction","path":"/","competitionName":null,"encounterLabel":null,"teamName":null}',
                 'sent', 1, $1, NULL, 'provider-1', $1, $1, '${PINNED}'),
                ('email-pending', 'event-pending', 'email', 'org-1', 'actor-alex', 'sanction',
                 '{"template":"sanction","path":"/","competitionName":null,"encounterLabel":null,"teamName":null}',
                 'pending', 1, $1, 'rejected alex@futrob.test', NULL, $1, NULL, '${PINNED}');`.replaceAll(
        "$1",
        `'${at}'`,
      ),
    );
  });

  afterAll(async () => {
    await isolated?.drop();
  });

  it("explains each responsibility that blocks the request instead of scheduling", async () => {
    const wrong = await modules.accountDeletion.request.execute({
      actorId: alex,
      password: "nope",
    });
    expect(!wrong.isOk() && wrong.error.code).toBe("identity.reauthentication_failed");

    const blocked = await modules.accountDeletion.request.execute({
      actorId: alex,
      password: PASSWORD,
    });

    expect(!blocked.isOk() && "details" in blocked.error && blocked.error.details).toEqual({
      blockers: [
        { kind: "sole-organizer", organizationId: "org-1", organizationName: "Liga Norte" },
        {
          kind: "active-captain",
          competitionId: "comp-live",
          competitionName: "Apertura",
          teamId: "team-1",
          teamName: "Halcones",
        },
      ],
    });
    expect(await count(`auth_sessions WHERE user_id = 'user-alex'`, [])).toBe(2);
  });

  it("schedules after the blockers are resolved and signs out every session", async () => {
    await isolated.pool.query(
      `INSERT INTO organization_memberships (organization_id, actor_id, role, created_at)
         VALUES ('org-1', 'actor-bea', 'organizer', now());
       UPDATE competition_roster_memberships SET role = 'player' WHERE id = 'roster-live';`,
    );

    const scheduled = await modules.accountDeletion.request.execute({
      actorId: alex,
      password: PASSWORD,
    });

    expect(scheduled.isOk() && scheduled.value.state).toEqual({
      kind: "scheduled",
      requestedAt: REQUESTED,
      scheduledFor: DEADLINE,
    });
    expect(await count(`auth_sessions WHERE user_id = 'user-alex'`, [])).toBe(0);
    // The person can still sign in during the grace period to cancel.
    expect(await count(`auth_users WHERE id = 'user-alex'`, [])).toBe(1);
  });

  it("anonymizes at the deadline, keeps history, and a second run changes nothing", async () => {
    now = new Date(DEADLINE.getTime() - 1);
    await expect(modules.accountDeletion.run.execute()).resolves.toEqual({
      deleted: 0,
      postponed: 0,
    });

    now = DEADLINE;
    await expect(modules.accountDeletion.run.execute()).resolves.toEqual({
      deleted: 1,
      postponed: 0,
    });

    // Identity: no way to sign in, no name or email.
    expect(await count(`auth_users WHERE id = 'user-alex'`, [])).toBe(0);
    expect(await count(`auth_accounts WHERE user_id = 'user-alex'`, [])).toBe(0);
    expect(await count(`identity_subjects WHERE actor_id = $1`)).toBe(0);
    expect(await count(`actor_contact_profiles WHERE actor_id = $1`)).toBe(0);
    expect(await count(`actors WHERE id = $1 AND deleted_at = $2`, [alex, DEADLINE])).toBe(1);
    // Other contexts: memberships, game identifiers, live rosters and personal stats go.
    expect(await count(`organization_memberships WHERE actor_id = $1`)).toBe(0);
    expect(await count(`player_game_accounts WHERE player_profile_id = 'profile-alex'`, [])).toBe(
      0,
    );
    expect(await count(`player_personal_stats WHERE player_profile_id = 'profile-alex'`, [])).toBe(
      0,
    );
    expect(await count(`activity_entries WHERE id = 'activity-1' AND status = 'closed'`, [])).toBe(
      1,
    );
    // Email: no stored address, name or body, no preferences, and the pending one is never sent.
    expect(await count(`notification_email_preferences WHERE actor_id = $1`)).toBe(0);
    const emails = await isolated.pool.query(
      `SELECT id, status, skip_reason, message, last_error FROM email_outbox ORDER BY id`,
    );
    expect(emails.rows).toEqual([
      {
        id: "email-pending",
        status: "skipped",
        skip_reason: "no_address",
        message: null,
        last_error: null,
      },
      { id: "email-sent", status: "sent", skip_reason: null, message: null, last_error: null },
    ]);
    await expect(modules.notifications.email.dispatch?.execute()).resolves.toEqual({
      sent: 0,
      retried: 0,
      failed: 0,
      skipped: 0,
    });
    expect(sent).toEqual([]);
    expect(await count(`notification_email_preferences WHERE actor_id = $1`)).toBe(0);
    // History stays: finished roster, official competition stats, audit and authorship.
    const rosters = await isolated.pool.query(
      `SELECT id, game_account_id FROM competition_roster_memberships ORDER BY id`,
    );
    expect(rosters.rows).toEqual([{ id: "roster-done", game_account_id: null }]);
    expect(
      await count(`player_competition_stats WHERE player_profile_id = 'profile-alex'`, []),
    ).toBe(1);
    expect(await count(`authorization_audit_log WHERE actor_id = $1`)).toBe(1);
    expect(await count(`competitions WHERE created_by_actor_id = $1`)).toBe(2);
    // Reads that still point at the tombstone name it «Cuenta eliminada», never the person.
    const invitations = await isolated.pool.query(
      `SELECT invited_by_display_name, invited_by_gamertag FROM roster_invitations WHERE id = 'inv-done'`,
    );
    expect(invitations.rows).toEqual([
      { invited_by_display_name: "Cuenta eliminada", invited_by_gamertag: null },
    ]);

    await expect(modules.accountDeletion.run.execute()).resolves.toEqual({
      deleted: 0,
      postponed: 0,
    });
  });
});
