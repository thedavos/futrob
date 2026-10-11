import { asActorId, asCompetitionId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { RecordActivityInput } from "./record-activity/record-activity.use-case.ts";
import {
  ORG_A,
  ORG_B,
  OPENER,
  OPERATOR,
  activityHarness,
  at,
} from "./activity-memory.test-support.ts";

const CMP_A = asCompetitionId("cmp-a");
const ORG_AUDIENCE = { audience: "organization", audienceId: ORG_A } as const;

function dispute(id: string, overrides: Partial<RecordActivityInput> = {}): RecordActivityInput {
  return {
    organizationId: ORG_A,
    competitionId: CMP_A,
    kind: "match_dispute",
    source: { name: "match_dispute", id },
    resource: { type: "encounter", id: `enc-${id}` },
    subject: { competitionName: "Liga A", encounterLabel: "Cuervos vs Halcones" },
    actorId: OPENER,
    recipients: [{ ...ORG_AUDIENCE, requiresAction: true }],
    ...overrides,
  };
}

const pending = { audiences: [ORG_AUDIENCE], status: "open", requiresAction: true } as const;

describe("activity use cases", () => {
  it("records a dispute once per audience, even when the command is retried", async () => {
    const h = activityHarness(at("10:00"));
    const first = await h.record.execute(dispute("dsp-1"));
    const again = await h.record.execute(dispute("dsp-1"));

    expect(first.isOk() && first.value.map((row) => row.id)).toEqual(
      again.isOk() && again.value.map((row) => row.id),
    );
    const listed = await h.list.execute(pending);
    expect(listed.isOk() && listed.value.items).toMatchObject([
      {
        kind: "match_dispute",
        status: "open",
        competitionId: "cmp-a",
        resourceId: "enc-dsp-1",
        subject: {
          competitionName: "Liga A",
          encounterLabel: "Cuervos vs Halcones",
          teamName: null,
        },
        openedAt: at("10:00"),
        lastEventAt: at("10:00"),
      },
    ]);
  });

  it("closes once and keeps the first close", async () => {
    const h = activityHarness(at("10:00"));
    await h.record.execute(dispute("dsp-1"));
    h.clock.current = at("11:00");
    const closed = await h.close.execute({
      source: { name: "match_dispute", id: "dsp-1" },
      closedByActorId: OPERATOR,
    });
    h.clock.current = at("12:00");
    const closedAgain = await h.close.execute({
      source: { name: "match_dispute", id: "dsp-1" },
      closedByActorId: OPENER,
    });

    expect(closed.isOk() && closed.value.closed).toBe(1);
    expect(closedAgain.isOk() && closedAgain.value.closed).toBe(0);
    const open = await h.list.execute(pending);
    expect(open.isOk() && open.value.items).toEqual([]);
    const recent = await h.list.execute({ audiences: [ORG_AUDIENCE] });
    expect(recent.isOk() && recent.value.items).toMatchObject([
      {
        status: "closed",
        closedAt: at("11:00"),
        lastEventAt: at("11:00"),
        closedByActorId: OPERATOR,
      },
    ]);
  });

  it("records a publication born closed and orders it by its last event", async () => {
    const h = activityHarness(at("09:00"));
    await h.record.execute({
      organizationId: ORG_A,
      competitionId: CMP_A,
      kind: "competition_published",
      source: { name: "competition", id: "cmp-a" },
      resource: { type: "competition", id: "cmp-a" },
      subject: { competitionName: "Liga A" },
      actorId: OPERATOR,
      bornClosed: true,
      recipients: [{ ...ORG_AUDIENCE, requiresAction: false }],
    });
    h.clock.current = at("10:00");
    await h.record.execute(dispute("dsp-1"));
    h.clock.current = at("11:00");
    await h.close.execute({
      source: { name: "match_dispute", id: "dsp-1" },
      closedByActorId: OPERATOR,
    });

    const open = await h.list.execute(pending);
    expect(open.isOk() && open.value.items).toEqual([]);
    const recent = await h.list.execute({ audiences: [ORG_AUDIENCE] });
    expect(recent.isOk() && recent.value.items.map((row) => [row.kind, row.status])).toEqual([
      ["match_dispute", "closed"],
      ["competition_published", "closed"],
    ]);
    const publication = recent.isOk() ? recent.value.items[1] : undefined;
    expect(publication?.closedAt).toEqual(at("09:00"));
    expect(publication?.openedAt).toEqual(at("09:00"));
  });

  it("keeps each organization's rows apart", async () => {
    const h = activityHarness(at("10:00"));
    await h.record.execute(
      dispute("dsp-1", {
        organizationId: ORG_B,
        recipients: [{ audience: "organization", audienceId: ORG_B, requiresAction: true }],
      }),
    );
    const listed = await h.list.execute({ audiences: [ORG_AUDIENCE], organizationId: ORG_A });
    expect(listed.isOk() && listed.value.items).toEqual([]);
  });

  it("closing an unknown source succeeds without changing anything", async () => {
    const h = activityHarness(at("10:00"));
    await h.record.execute(dispute("dsp-1"));
    const closed = await h.close.execute({
      source: { name: "match_dispute", id: "missing" },
      closedByActorId: OPERATOR,
    });
    expect(closed.isOk() && closed.value.closed).toBe(0);
    const open = await h.list.execute(pending);
    expect(open.isOk() && open.value.items.map((row) => row.sourceId)).toEqual(["dsp-1"]);
  });

  it("drops an expired invitation from pending, only for its invitee", async () => {
    const h = activityHarness(at("10:00"));
    const invitee = asActorId("act-1");
    await h.record.execute({
      organizationId: ORG_A,
      competitionId: CMP_A,
      kind: "roster_invitation",
      source: { name: "roster_invitation", id: "inv-1" },
      resource: { type: "roster_invitation", id: "inv-1" },
      subject: { teamName: "Cuervos" },
      actorId: OPENER,
      expiresAt: at("12:00"),
      recipients: [
        { audience: "actor", audienceId: invitee, requiresAction: true },
        { ...ORG_AUDIENCE, requiresAction: false },
      ],
    });
    const mine = {
      audiences: [{ audience: "actor", audienceId: invitee }],
      status: "open",
      requiresAction: true,
    } as const;

    h.clock.current = at("11:00");
    const before = await h.list.execute(mine);
    expect(before.isOk() && before.value.items.map((row) => row.sourceId)).toEqual(["inv-1"]);
    const someoneElse = await h.list.execute({
      ...mine,
      audiences: [{ audience: "actor", audienceId: "act-2" }],
    });
    expect(someoneElse.isOk() && someoneElse.value.items).toEqual([]);
    const watched = await h.list.execute(pending);
    expect(watched.isOk() && watched.value.items).toEqual([]);

    h.clock.current = at("12:01");
    const after = await h.list.execute(mine);
    expect(after.isOk() && after.value.items).toEqual([]);
  });

  it("lists a proposal only for the team that must confirm it", async () => {
    const h = activityHarness(at("10:00"));
    await h.record.execute({
      organizationId: ORG_A,
      competitionId: CMP_A,
      kind: "selection_confirmation",
      source: { name: "proposal", id: "p-1" },
      resource: { type: "encounter", id: "enc-1" },
      actorId: OPENER,
      recipients: [
        { audience: "team", audienceId: "tm-away", requiresAction: true },
        { ...ORG_AUDIENCE, requiresAction: false },
      ],
    });
    const away = await h.list.execute({ audiences: [{ audience: "team", audienceId: "tm-away" }] });
    const home = await h.list.execute({ audiences: [{ audience: "team", audienceId: "tm-home" }] });
    expect(away.isOk() && away.value.items.map((row) => row.sourceId)).toEqual(["p-1"]);
    expect(home.isOk() && home.value.items).toEqual([]);
  });

  it("pages by cursor without repeating or skipping rows that share a time", async () => {
    const h = activityHarness(at("10:00"));
    for (let index = 0; index < 12; index += 1) {
      if (index >= 6) h.clock.current = at("11:00");
      await h.record.execute(dispute(`dsp-${index}`));
    }
    const first = await h.list.execute({ audiences: [ORG_AUDIENCE], limit: 10 });
    if (!first.isOk()) throw new Error("first page failed");
    expect(first.value.items).toHaveLength(10);
    expect(first.value.nextCursor).toBeDefined();
    const second = await h.list.execute({
      audiences: [ORG_AUDIENCE],
      limit: 10,
      cursor: first.value.nextCursor,
    });
    if (!second.isOk()) throw new Error("second page failed");
    expect(second.value.items).toHaveLength(2);
    expect(second.value.nextCursor).toBeUndefined();
    const ids = [...first.value.items, ...second.value.items].map((row) => row.sourceId);
    expect(new Set(ids).size).toBe(12);
  });

  it("rejects invalid recipients, limits and cursors", async () => {
    const h = activityHarness();
    const noRecipients = await h.record.execute(dispute("dsp-1", { recipients: [] }));
    const foreignOrg = await h.record.execute(
      dispute("dsp-1", {
        recipients: [{ audience: "organization", audienceId: ORG_B, requiresAction: true }],
      }),
    );
    const closedAction = await h.record.execute(dispute("dsp-1", { bornClosed: true }));
    expect([noRecipients, foreignOrg, closedAction].map((r) => r.isErr() && r.error.code)).toEqual([
      "notifications.invalid_activity",
      "notifications.invalid_activity",
      "notifications.invalid_activity",
    ]);
    const limit = await h.list.execute({ audiences: [ORG_AUDIENCE], limit: 51 });
    const cursor = await h.list.execute({ audiences: [ORG_AUDIENCE], cursor: "nope" });
    expect(limit.isErr() && limit.error.code).toBe("notifications.invalid_activity");
    expect(cursor.isErr() && cursor.error.code).toBe("notifications.invalid_cursor");
  });
});
