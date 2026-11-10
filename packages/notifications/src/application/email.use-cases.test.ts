import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EmailIntent } from "../domain/entities/email-intent.ts";
import type { EnqueueEmailsInput } from "./enqueue-emails/enqueue-emails.use-case.ts";
import { CAPTAIN, ORGANIZER, ORG_A, STAFF, emailHarness } from "./email-memory.test-support.ts";

const CMP = asCompetitionId("cmp-a");
const PROPOSER = asActorId("act-proposer");

const names = {
  competitionName: "Liga Norte",
  encounterLabel: "Cuervos vs Halcones",
  teamName: "Cuervos",
} as const;

const selection = (requiresAction: boolean): EmailIntent => ({
  template: "proposed_selection",
  requiresAction,
  path: "/player/competitions/cmp-a/matches",
  ...names,
});

const registration: EmailIntent = {
  template: "registration",
  requiresAction: true,
  path: "/orgs/org-a/competitions/cmp-a/teams",
  ...names,
};

function proposalFact(overrides: Partial<EnqueueEmailsInput> = {}): EnqueueEmailsInput {
  return {
    eventId: "proposal:prp-1",
    organizationId: ORG_A,
    actorId: PROPOSER,
    audiences: [
      {
        audience: {
          organizationId: ORG_A,
          competitionId: CMP,
          audience: "team",
          audienceId: "team-rival",
        },
        intent: selection(true),
      },
      {
        audience: {
          organizationId: ORG_A,
          competitionId: CMP,
          audience: "organization",
          audienceId: ORG_A,
        },
        intent: selection(false),
      },
    ],
    ...overrides,
  };
}

const minutes = (count: number) => count * 60_000;

describe("email notifications", () => {
  it("sends one Spanish email per recipient for a fact, and none again when the fact is replayed", async () => {
    const h = emailHarness();
    await h.enqueue.execute(proposalFact());
    await h.enqueue.execute(proposalFact());

    expect(await h.dispatch.execute()).toEqual({ sent: 2, retried: 0, failed: 0, skipped: 1 });
    expect(await h.dispatch.execute()).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 0 });

    expect(h.sender.inbox.map((message) => [message.to, message.subject])).toEqual([
      ["captain@example.test", "Confirma la selección de Cuervos vs Halcones"],
      ["organizer@example.test", "Selección propuesta: Cuervos vs Halcones"],
    ]);
    const [captainEmail] = h.sender.inbox;
    expect(captainEmail?.text).toContain("Hola, Capi:");
    expect(captainEmail?.text).toContain(
      "Confírmala o abre una disputa antes de que venza el plazo.",
    );
    expect(captainEmail?.text).toContain(
      "Revisar selección: https://futrob.test/player/competitions/cmp-a/matches",
    );
    expect(
      (await h.outbox.listByEvent("proposal:prp-1")).map((row) => [
        row.recipientActorId,
        row.status,
        row.skipReason,
      ]),
    ).toEqual([
      [CAPTAIN, "sent", null],
      [ORGANIZER, "sent", null],
      [STAFF, "skipped", "no_address"],
    ]);
  });

  it("does not email the actor who caused the fact, and emails an actor in two audiences once", async () => {
    const h = emailHarness();
    const deliveries = await h.enqueue.execute(
      proposalFact({
        actorId: STAFF,
        audiences: [
          ...proposalFact().audiences,
          {
            audience: {
              organizationId: ORG_A,
              competitionId: CMP,
              audience: "actor",
              audienceId: CAPTAIN,
            },
            intent: registration,
          },
        ],
      }),
    );

    expect(deliveries.map((row) => [row.recipientActorId, row.intent])).toEqual([
      [CAPTAIN, selection(true)],
      [ORGANIZER, selection(false)],
    ]);
  });

  it("retries a provider outage with backoff and sends it later with the same idempotency key", async () => {
    const h = emailHarness();
    await h.enqueue.execute(proposalFact({ audiences: proposalFact().audiences.slice(0, 1) }));
    h.sender.failures.push({ retryable: true }, { retryable: true });

    expect(await h.dispatch.execute()).toMatchObject({ sent: 0, retried: 1 });
    h.clock.current = new Date(h.clock.current.getTime() + minutes(1));
    expect(await h.dispatch.execute()).toMatchObject({ sent: 0, retried: 1 });
    h.clock.current = new Date(h.clock.current.getTime() + minutes(4));
    expect(await h.dispatch.execute()).toMatchObject({ sent: 0, retried: 0 });
    h.clock.current = new Date(h.clock.current.getTime() + minutes(1));
    expect(await h.dispatch.execute()).toMatchObject({ sent: 1, retried: 0 });

    const [row] = await h.outbox.listByEvent("proposal:prp-1");
    expect(row).toMatchObject({ status: "sent", attempts: 3, lastError: "provider unavailable" });
    expect(h.sender.inbox.map((message) => message.idempotencyKey)).toEqual([
      `email-delivery/${row?.id}`,
    ]);
  });

  it("fails a delivery the provider rejects, and one whose retries run out", async () => {
    const rejected = emailHarness();
    await rejected.enqueue.execute(
      proposalFact({ audiences: proposalFact().audiences.slice(0, 1) }),
    );
    rejected.sender.failures.push({ retryable: false });
    expect(await rejected.dispatch.execute()).toMatchObject({ failed: 1, retried: 0 });

    const outage = emailHarness();
    await outage.enqueue.execute(proposalFact({ audiences: proposalFact().audiences.slice(0, 1) }));
    const results = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      outage.sender.failures.push({ retryable: true });
      results.push(await outage.dispatch.execute());
      outage.clock.current = new Date(outage.clock.current.getTime() + minutes(720));
    }
    expect(results.map((result) => [result.retried, result.failed])).toEqual([
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
      [0, 1],
    ]);
    expect(await outage.dispatch.execute()).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 0 });
  });

  it("skips email for an organization whose plan is web only", async () => {
    const h = emailHarness({ freeOrganizations: [ORG_A] });
    await h.enqueue.execute(proposalFact());
    expect(await h.dispatch.execute()).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 3 });
    expect(h.sender.inbox).toEqual([]);
    expect((await h.outbox.listByEvent("proposal:prp-1")).map((row) => row.skipReason)).toEqual([
      "plan_without_email",
      "plan_without_email",
      "plan_without_email",
    ]);
  });

  it("puts a one-click unsubscribe on non-critical email, and an opted-out actor keeps critical email only", async () => {
    const h = emailHarness();
    const organizerOnly = (eventId: string, intent: EmailIntent) =>
      h.enqueue.execute({
        eventId,
        organizationId: ORG_A,
        actorId: PROPOSER,
        audiences: [
          {
            audience: {
              organizationId: ORG_A,
              competitionId: CMP,
              audience: "actor",
              audienceId: ORGANIZER,
            },
            intent,
          },
        ],
      });
    await organizerOnly("entry:1", registration);
    await h.dispatch.execute();
    const [optional] = h.sender.inbox;
    const unsubscribeUrl = optional?.headers["List-Unsubscribe"]?.slice(1, -1) ?? "";
    expect(optional?.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(optional?.text).toContain(`Dejar de recibir estos avisos: ${unsubscribeUrl}`);

    const token = unsubscribeUrl.split("?token=")[1] ?? "";
    const unsubscribed = await h.unsubscribe.execute({ token });
    expect(unsubscribed.isOk() && unsubscribed.value).toEqual({
      locale: "es",
      nonCriticalEmail: false,
    });

    await organizerOnly("entry:2", registration);
    await organizerOnly("dispute:1", {
      template: "result_or_dispute",
      result: "disputed",
      path: "/orgs/org-a/competitions/cmp-a/disputes",
      ...names,
    });
    expect(await h.dispatch.execute()).toMatchObject({ sent: 1, skipped: 1 });
    const critical = h.sender.inbox[1];
    expect(critical?.subject).toBe("Disputa abierta: Cuervos vs Halcones");
    expect(critical?.headers).toEqual({});
    expect(critical?.text).not.toContain("Dejar de recibir");
  });

  it("rejects an unknown unsubscribe token", async () => {
    const h = emailHarness();
    const result = await h.unsubscribe.execute({ token: "forged" });
    expect(!result.isOk() && result.error.code).toBe("notifications.unknown_unsubscribe_token");
  });

  it("writes in the recipient's saved locale", async () => {
    const h = emailHarness();
    expect(await h.getPreferences.execute({ actorId: CAPTAIN })).toEqual({
      locale: "es",
      nonCriticalEmail: true,
    });
    await h.savePreferences.execute({ actorId: CAPTAIN, locale: "en", nonCriticalEmail: true });
    await h.enqueue.execute(proposalFact({ audiences: proposalFact().audiences.slice(0, 1) }));
    await h.dispatch.execute();
    expect(h.sender.inbox[0]?.subject).toBe("Confirm the selection for Cuervos vs Halcones");
    expect(h.sender.inbox[0]?.text).toContain("Hi Capi,");
  });

  it("escapes names in the HTML body", async () => {
    const h = emailHarness();
    await h.enqueue.execute(
      proposalFact({
        audiences: [
          {
            audience: {
              organizationId: ORG_A,
              competitionId: CMP,
              audience: "team",
              audienceId: "team-rival",
            },
            intent: { ...selection(true), teamName: '<img src=x onerror="alert(1)">' },
          },
        ],
      }),
    );
    await h.dispatch.execute();
    const html = h.sender.inbox[0]?.html ?? "";
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; propuso");
    expect(html).not.toContain("<img");
  });

  it("isolates organizations: a free organization does not block email of a paid one", async () => {
    const other = asOrganizationId("org-free");
    const h = emailHarness({ freeOrganizations: [other] });
    await h.enqueue.execute(proposalFact({ audiences: proposalFact().audiences.slice(0, 1) }));
    await h.enqueue.execute(
      proposalFact({
        eventId: "proposal:prp-2",
        organizationId: other,
        audiences: proposalFact().audiences.slice(0, 1),
      }),
    );
    expect(await h.dispatch.execute()).toMatchObject({ sent: 1, skipped: 1 });
  });
});
