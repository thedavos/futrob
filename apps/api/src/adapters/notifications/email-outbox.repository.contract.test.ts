import {
  EnqueueEmailsUseCase,
  UnsubscribeEmailUseCase,
  defaultEmailPreferences,
  type EmailIntent,
  type EmailOutboxRepository,
  type EmailPreferencesRepository,
} from "@futrob/notifications";
import { asActorId, asOrganizationId, type ActorId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { InMemoryEmailOutboxRepository } from "./email-outbox.in-memory.repository.ts";
import { PostgresEmailOutboxRepository } from "./email-outbox.repository.ts";
import {
  InMemoryEmailPreferencesRepository,
  PostgresEmailPreferencesRepository,
} from "./email-preferences.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const ORG = asOrganizationId("org-mail");
const CAUSE = asActorId("act-cause");
const ANA = asActorId("act-ana");
const BETO = asActorId("act-beto");
const TOKEN = "tok-ana-0000000000000000000000000000";

const decision: EmailIntent = {
  template: "organizer_decision",
  outcome: "entry_approved",
  path: "/player/competitions/cmp-1/matches",
  competitionName: "Liga Correo",
  encounterLabel: null,
  teamName: "Cuervos",
};

function at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 7, 10, minute));
}

/** Runs the email use cases over a pair of adapters and asserts only what they expose. */
function contract(
  name: string,
  adapters: () => {
    readonly outbox: EmailOutboxRepository;
    readonly preferences: EmailPreferencesRepository;
  },
) {
  describe(name, () => {
    let now = at(0);
    let sequence = 0;
    let outbox: EmailOutboxRepository;
    let preferences: EmailPreferencesRepository;
    let enqueue: EnqueueEmailsUseCase;

    beforeEach(() => {
      now = at(0);
      ({ outbox, preferences } = adapters());
      enqueue = new EnqueueEmailsUseCase({
        outbox,
        recipients: { actorsFor: async () => [CAUSE, ANA, BETO] },
        clock: { now: () => now },
        ids: { generate: () => `${name}-delivery-${String(++sequence).padStart(4, "0")}` },
      });
    });

    function fact(eventId: string) {
      return enqueue.execute({
        eventId,
        organizationId: ORG,
        actorId: CAUSE,
        audiences: [
          {
            audience: {
              organizationId: ORG,
              competitionId: null,
              audience: "organization",
              audienceId: ORG,
            },
            intent: decision,
          },
        ],
      });
    }

    it("keeps one email per event, channel and recipient when a fact is replayed", async () => {
      await fact("activity:organizer_decision:entry-1");
      now = at(5);
      await fact("activity:organizer_decision:entry-1");

      const queued = await outbox.listByEvent("activity:organizer_decision:entry-1");
      expect(queued.map((row) => [row.recipientActorId, row.status, row.createdAt])).toEqual([
        [ANA, "pending", at(0)],
        [BETO, "pending", at(0)],
      ]);
      expect(queued[0]?.intent).toEqual(decision);
    });

    it("pins the first request of a delivery and returns it to every later send", async () => {
      await fact("event-pinned");
      const [claimed] = await outbox.claimDue({ now: at(0), leaseUntil: at(10), limit: 1 });
      const id = claimed?.id ?? "";
      const first = {
        to: "ana@example.test",
        subject: "Hola",
        html: "<p>Hola</p>",
        text: "Hola",
        headers: {
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "List-Unsubscribe": "<u>",
        },
        idempotencyKey: `email-delivery/${id}`,
      };

      expect(await outbox.pinMessage(id, first)).toEqual(first);
      expect(await outbox.pinMessage(id, { ...first, to: "new@example.test" })).toEqual(first);
      await outbox.settle(id, { kind: "retry", error: "lost", nextAttemptAt: at(1) });
      const retried = await outbox.claimDue({ now: at(1), leaseUntil: at(11), limit: 10 });
      expect(retried.find((row) => row.id === id)).toMatchObject({ attempts: 2, message: first });
    });

    it("claims due rows once per lease, oldest first, and settles each outcome", async () => {
      await fact("event-early");
      now = at(1);
      await fact("event-late");

      const first = await outbox.claimDue({ now: at(1), leaseUntil: at(11), limit: 3 });
      expect(first.map((row) => [row.eventId, row.recipientActorId, row.attempts])).toEqual([
        ["event-early", ANA, 1],
        ["event-early", BETO, 1],
        ["event-late", ANA, 1],
      ]);
      expect(await outbox.claimDue({ now: at(2), leaseUntil: at(12), limit: 10 })).toMatchObject([
        { eventId: "event-late", recipientActorId: BETO },
      ]);
      expect(await outbox.claimDue({ now: at(3), leaseUntil: at(13), limit: 10 })).toEqual([]);

      const [ana, beto, late] = first;
      await outbox.settle(ana?.id ?? "", { kind: "sent", providerMessageId: "re_1", at: at(2) });
      await outbox.settle(beto?.id ?? "", {
        kind: "retry",
        error: "HTTP 503",
        nextAttemptAt: at(4),
      });
      await outbox.settle(late?.id ?? "", { kind: "skipped", reason: "opted_out", at: at(2) });
      await outbox.settle(ana?.id ?? "", { kind: "failed", error: "late", at: at(3) });

      expect(await outbox.listByEvent("event-early")).toMatchObject([
        { recipientActorId: ANA, status: "sent", providerMessageId: "re_1", settledAt: at(2) },
        { recipientActorId: BETO, status: "pending", lastError: "HTTP 503", nextAttemptAt: at(4) },
      ]);
      expect(await outbox.claimDue({ now: at(4), leaseUntil: at(14), limit: 10 })).toMatchObject([
        { eventId: "event-early", recipientActorId: BETO, attempts: 2 },
      ]);
      expect(await outbox.listByEvent("event-late")).toMatchObject([
        { recipientActorId: ANA, status: "skipped", skipReason: "opted_out" },
        { recipientActorId: BETO, status: "pending", attempts: 1 },
      ]);
    });

    it("keeps the first preferences row and finds it by its unsubscribe token", async () => {
      const stored = await preferences.insertIfAbsent(
        defaultEmailPreferences({ actorId: ANA, unsubscribeToken: TOKEN, now: at(0) }),
      );
      const again = await preferences.insertIfAbsent(
        defaultEmailPreferences({
          actorId: ANA,
          unsubscribeToken: "tok-other-000000000000000000000000000",
          now: at(1),
        }),
      );
      expect(again).toEqual(stored);

      const unsubscribe = new UnsubscribeEmailUseCase({
        preferences,
        clock: { now: () => at(2) },
      });
      const done = await unsubscribe.execute({ token: TOKEN });
      expect(done.isOk()).toBe(true);
      expect(await preferences.findByActor(ANA)).toEqual({
        actorId: ANA,
        locale: "es",
        nonCriticalEmail: false,
        unsubscribeToken: TOKEN,
        updatedAt: at(2),
      });
      expect(await preferences.findByUnsubscribeToken("forged")).toBeNull();
      expect(await preferences.findByActor(BETO as ActorId)).toBeNull();
    });
  });
}

contract("memory", () => ({
  outbox: new InMemoryEmailOutboxRepository(),
  preferences: new InMemoryEmailPreferencesRepository(),
}));

describe.skipIf(!databaseUrl)("postgres email outbox", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "email_outbox");
    await migrateIsolatedSchema(isolated.pool);
  });

  afterAll(async () => {
    await isolated?.drop();
  });

  beforeEach(async () => {
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.email_outbox, ${schema}.notification_email_preferences,
        ${schema}.organizations, ${schema}.actors CASCADE`,
    );
    await seedActors(isolated.pool, CAUSE, ANA, BETO, "organizer");
    await isolated.pool.query(
      `INSERT INTO organizations (
         id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
       ) VALUES ($1, $1, $1, $1, 'UTC', NOW(), 'organizer')`,
      [ORG],
    );
  });

  contract("postgres", () => ({
    outbox: new PostgresEmailOutboxRepository(isolated.pool),
    preferences: new PostgresEmailPreferencesRepository(isolated.pool),
  }));
});
