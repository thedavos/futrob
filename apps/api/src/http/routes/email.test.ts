import { emailPreferencesSchema, runEmailDispatchResponseSchema } from "@futrob/api-contracts";
import {
  EmailSendFailed,
  type EmailMessage as SentEmail,
  type EmailSenderPort,
} from "@futrob/notifications";
import { asActorId, asOrganizationId, err, ok } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryActorContactReader } from "@/adapters/identity/actor-contact.reader.ts";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import type { EmailSettings } from "@/di/notifications.module.ts";
import { createOrganizationCompetitionFixture } from "@/http/organization-competition.fixture.ts";
import {
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";
import { assignOrganizationPlanForTest } from "@/testing/organization-plan.fixture.ts";

const LEAGUE_RULES = {
  regularStage: {
    officialMatchesPerEncounter: 1,
    resolutionMode: "independent_matches",
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: true,
    maxReschedulesPerTeam: 2,
    minimumRescheduleNoticeHours: 12,
    rescheduleProposalExpiryHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  },
  knockoutStage: null,
  maxRosterSize: 16,
};

const ORGANIZER = "actor-mail-organizer";
const APPLICANT = "actor-mail-applicant";
const DISPATCH = "/api/v1/internal/notifications/email-dispatch/run";
const PREFERENCES = "/api/v1/notifications/email-preferences";
const UNSUBSCRIBE = "/api/v1/public/email/unsubscribe";

/** Provider double: fails the next sends with the queued failures, then delivers. */
class ScriptedSender implements EmailSenderPort {
  readonly delivered: SentEmail[] = [];
  readonly failures: boolean[] = [];

  async send(message: SentEmail) {
    const retryable = this.failures.shift();
    if (retryable !== undefined) {
      return err(
        new EmailSendFailed({
          code: "notifications.email_send_failed",
          message: "Resend refused the email with HTTP 503",
          retryable,
        }),
      );
    }
    this.delivered.push(message);
    return ok({ providerMessageId: `re_${this.delivered.length}` });
  }
}

/** A clock the test moves by hand, so retries come due without waiting. */
class ManualClock {
  current = new Date("2026-10-01T12:00:00.000Z");
  now(): Date {
    return new Date(this.current);
  }
  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}

function setup(email: Partial<EmailSettings> = {}) {
  const sender = new ScriptedSender();
  const clock = new ManualClock();
  const modules = createModules({
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: undefined,
    clock,
    email: { sender, webBaseUrl: "https://futrob.test", ...email },
  });
  const contacts = modules.identity.contacts;
  if (!(contacts instanceof InMemoryActorContactReader)) throw new Error("memory contacts");
  for (const [actorId, name] of [
    [ORGANIZER, "Orga"],
    [APPLICANT, "Capi"],
  ] as const) {
    contacts.rows.set(asActorId(actorId), {
      actorId: asActorId(actorId),
      displayName: name,
      email: `${name.toLowerCase()}@example.test`,
    });
  }
  const app = createApp({
    modules,
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: INTERNAL_JOB_SECRET,
    correlationLogger: { info() {}, error() {} },
  });
  return { app, modules, sender, clock };
}

type Setup = ReturnType<typeof setup>;

/** An organization whose open competition receives one application from APPLICANT. */
async function competitionWithApplication(
  { app, modules }: Setup,
  plan: "free" | "pro",
): Promise<{ readonly base: string; readonly entryId: string }> {
  const created = await createOrganizationCompetitionFixture(app, {
    method: "POST",
    headers: serviceHeaders(ORGANIZER),
    body: JSON.stringify({
      name: "Mail Org",
      competition: onboardingCompetition,
      gameAccount: null,
    }),
  });
  const organizationId = created.organizationId;
  const competitionId = created.competition.competition.id;
  if (plan === "pro") {
    await assignOrganizationPlanForTest(modules, {
      organizationId: asOrganizationId(organizationId),
      actorId: asActorId(ORGANIZER),
      planKey: "pro",
    });
  }
  const base = `/api/v1/organizations/${organizationId}/competitions/${competitionId}`;
  const configured = await app.request(base, {
    method: "PATCH",
    headers: serviceHeaders(ORGANIZER),
    body: JSON.stringify({
      ...onboardingCompetition,
      name: "Liga Correo",
      rules: LEAGUE_RULES,
      teams: { min: 2, max: 4 },
      schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
    }),
  });
  expect(configured.status).toBe(200);
  const opened = await app.request(`${base}/registration/open`, {
    method: "POST",
    headers: serviceHeaders(ORGANIZER),
  });
  expect(opened.status).toBe(200);
  const applied = await app.request(`/api/v1/competitions/explore/${competitionId}/application`, {
    method: "POST",
    headers: serviceHeaders(APPLICANT),
    body: JSON.stringify({ teamName: "Cuervos", creationKey: "apply-cuervos-key-0001" }),
  });
  expect(applied.status).toBe(201);
  const { entryId } = (await applied.json()) as { entryId: string };
  return { base, entryId };
}

async function dispatch(app: Setup["app"]) {
  const response = await app.request(DISPATCH, {
    method: "POST",
    headers: { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` },
  });
  expect(response.status).toBe(200);
  return parseResponse(runEmailDispatchResponseSchema, response);
}

describe("apps/api http email", () => {
  it("emails the organizer once about an application, and the Team about the decision", async () => {
    const h = setup();
    const { base, entryId } = await competitionWithApplication(h, "pro");

    expect(await dispatch(h.app)).toEqual({ sent: 1, retried: 0, failed: 0, skipped: 0 });
    expect(await dispatch(h.app)).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 0 });
    expect(h.sender.delivered.map((mail) => [mail.to, mail.subject])).toEqual([
      ["orga@example.test", "Nueva inscripción en Liga Correo"],
    ]);
    const [application] = h.sender.delivered;
    expect(application?.text).toContain("Cuervos pidió inscribirse en Liga Correo.");
    expect(application?.text).toContain(`Revisar inscripción: https://futrob.test/orgs/`);
    expect(application?.idempotencyKey).toMatch(/^email-delivery\//);

    const approved = await h.app.request(`${base}/entries/${entryId}/approve`, {
      method: "POST",
      headers: serviceHeaders(ORGANIZER),
    });
    expect(approved.status).toBe(200);
    expect(await dispatch(h.app)).toMatchObject({ sent: 1 });
    expect(h.sender.delivered.at(-1)).toMatchObject({
      to: "capi@example.test",
      subject: "Decisión del organizador en Liga Correo",
    });
  });

  it("keeps the command when the provider is down and sends on a later run", async () => {
    const h = setup();
    h.sender.failures.push(true);
    const { entryId } = await competitionWithApplication(h, "pro");
    const eventId = `activity:competition_entry:${entryId}`;

    expect(await dispatch(h.app)).toEqual({ sent: 0, retried: 1, failed: 0, skipped: 0 });
    const [delivery] = await h.modules.notifications.email.outbox.listByEvent(eventId);
    expect(delivery).toMatchObject({
      status: "pending",
      attempts: 1,
      lastError: "Resend refused the email with HTTP 503",
    });

    expect(await dispatch(h.app)).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 0 });
    h.clock.advanceMinutes(1);
    expect(await dispatch(h.app)).toEqual({ sent: 1, retried: 0, failed: 0, skipped: 0 });
    const [settled] = await h.modules.notifications.email.outbox.listByEvent(eventId);
    expect(settled).toMatchObject({ status: "sent", attempts: 2, providerMessageId: "re_1" });
    expect(h.sender.delivered).toHaveLength(1);
  });

  it("skips email for an organization on Free, which is web only", async () => {
    const h = setup();
    await competitionWithApplication(h, "free");

    expect(await dispatch(h.app)).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 1 });
    expect(h.sender.delivered).toEqual([]);
  });

  it("unsubscribes with the link token, and an actor can turn non-critical email back on", async () => {
    const h = setup();
    await competitionWithApplication(h, "pro");
    await dispatch(h.app);
    const header = h.sender.delivered[0]?.headers["List-Unsubscribe"] ?? "";
    const token = new URL(header.slice(1, -1)).searchParams.get("token") ?? "";

    const forged = await h.app.request(UNSUBSCRIBE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "forged-token" }),
    });
    expect(forged.status).toBe(404);
    expect(await forged.json()).toMatchObject({ code: "notifications.unknown_unsubscribe_token" });

    for (const _ of [1, 2]) {
      const unsubscribed = await h.app.request(UNSUBSCRIBE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      expect(unsubscribed.status).toBe(200);
      expect(await unsubscribed.json()).toEqual({ nonCriticalEmail: false });
    }

    const mine = await h.app.request(PREFERENCES, { headers: serviceHeaders(ORGANIZER) });
    expect(await parseResponse(emailPreferencesSchema, mine)).toEqual({
      locale: "es",
      nonCriticalEmail: false,
    });
    const saved = await h.app.request(PREFERENCES, {
      method: "PUT",
      headers: serviceHeaders(ORGANIZER),
      body: JSON.stringify({ locale: "en", nonCriticalEmail: true }),
    });
    expect(await parseResponse(emailPreferencesSchema, saved)).toEqual({
      locale: "en",
      nonCriticalEmail: true,
    });
    const other = await h.app.request(PREFERENCES, { headers: serviceHeaders(APPLICANT) });
    expect(await other.json()).toEqual({ locale: "es", nonCriticalEmail: true });
  });

  it("guards the preferences, the unsubscribe body and the dispatch runner", async () => {
    const h = setup();
    expect((await h.app.request(PREFERENCES)).status).toBe(401);
    const badLocale = await h.app.request(PREFERENCES, {
      method: "PUT",
      headers: serviceHeaders(ORGANIZER),
      body: JSON.stringify({ locale: "fr", nonCriticalEmail: true }),
    });
    expect(badLocale.status).toBe(400);
    const empty = await h.app.request(UNSUBSCRIBE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "" }),
    });
    expect(empty.status).toBe(400);
    expect((await h.app.request(DISPATCH, { method: "POST" })).status).toBe(401);

    const unconfigured = setup({ sender: null });
    const pending = await unconfigured.app.request(DISPATCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` },
    });
    expect(pending.status).toBe(503);
    expect(await pending.json()).toMatchObject({
      code: "notifications.email_provider_not_configured",
    });
  });
});
