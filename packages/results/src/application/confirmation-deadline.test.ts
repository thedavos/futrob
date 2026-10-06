import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { ACTORS, AWAY, createSelectionHarness, slotRefs } from "./selection-flow.test-support.ts";

const SYSTEM = asActorId("actor-expiry");
async function pending(incomplete = false) {
  const h = createSelectionHarness({
    scheduledStartAt: new Date("2026-10-03T18:00:00.000Z"),
    matchOccurredAt: "2026-10-03T18:00:00.000Z",
    incompleteMatchIds: incomplete ? ["m-1"] : [],
  });
  h.clockState.now = new Date("2026-10-03T20:00:00.000Z");
  await h.associate(h.base().encounterId, ["m-1", "m-2"]);
  const proposed = await h.propose(["m-1"]);
  if (!proposed.isOk() || !proposed.value.proposal) throw new Error("Proposal failed");
  const proposal = proposed.value.proposal;
  const response = {
    ...h.base(),
    actorId: ACTORS.awayCaptain,
    actingTeamId: AWAY,
    proposalId: proposal.id,
    expectedVersion: 1,
    commandKey: "response",
  };
  const expiry = { ...h.base(), actorId: SYSTEM, proposalId: proposal.id };
  return { h, proposal, response, expiry };
}

const vectors = [
  ["V21-01", "confirm", "2026-10-04T11:59:59.999Z", "approved"],
  ["V21-02", "confirm", "2026-10-04T12:00:00.000Z", "approved"],
  ["V21-03", "confirm", "2026-10-04T19:59:59.999Z", "approved"],
  ["V21-04", "confirm", "2026-10-04T20:00:00.000Z", "closed"],
  ["V21-05", "confirm", "2026-10-04T20:00:00.001Z", "closed"],
  ["V21-06", "equivalent", "2026-10-04T19:59:59.999Z", "approved"],
  ["V21-07", "equivalent", "2026-10-04T20:00:00.000Z", "closed"],
  ["V21-08", "flag", "2026-10-04T19:59:59.999Z", "organizer_review"],
  ["V21-09", "reject", "2026-10-04T20:00:00.000Z", "closed"],
] as const;

describe("DEC-021 validated A", () => {
  it.each(vectors)("%s %s at %s produces %s", async (_id, command, time, expected) => {
    const { h, proposal, response } = await pending(command === "flag");
    h.clockState.now = new Date(time);
    const outcome =
      command === "equivalent"
        ? await h.useCases.alternative.execute({
            ...response,
            selections: slotRefs("m-1"),
            reason: "Same slots",
          })
        : command === "reject"
          ? await h.useCases.reject.execute({ ...response, reason: "Incorrect score" })
          : await h.useCases.confirm.execute(response);
    if (expected === "closed") {
      expect(outcome.isErr() ? outcome.error.code : "approved").toBe(
        "results.confirmation_window_closed",
      );
      expect(await h.selections.findLatestByEncounter(response.encounterId)).toMatchObject({
        status: "awaiting_opponent_confirmation",
        version: 1,
      });
      expect(await h.results.listByEncounter(response.encounterId)).toEqual([]);
      expect((await h.selections.listActions(response.encounterId)).map((a) => a.type)).toEqual([
        "proposed",
      ]);
    } else {
      expect(outcome.isOk() ? outcome.value.selection.status : outcome.error.code).toBe(expected);
      if (!outcome.isOk()) throw new Error("Response failed");
      if (expected === "approved") {
        expect(outcome.value.approvedResult).toMatchObject({
          revision: 1,
          approvalBasis: "team_agreement",
          proposalId: proposal.id,
          approvedAt: new Date(time),
        });
        expect(
          (await h.results.listByEncounter(response.encounterId)).map((r) => ({
            status: r.status,
            revision: r.revision,
          })),
        ).toEqual([{ status: "approved", revision: 1 }]);
      } else expect(await h.results.listByEncounter(response.encounterId)).toEqual([]);
    }
  });

  it.each([
    ["V21-10", "2026-10-04T19:59:59.999Z", "skipped", "awaiting_opponent_confirmation"],
    ["V21-11", "2026-10-04T20:00:00.000Z", "expired", "organizer_review"],
  ] as const)("%s silence at %s produces %s", async (_id, time, outcome, status) => {
    const { h, proposal, expiry } = await pending();
    h.clockState.now = new Date(time);
    const result = await h.useCases.expire.execute(expiry);
    expect(result.isOk() ? result.value : result.error.code).toEqual({ status: outcome });
    expect(await h.selections.findLatestByEncounter(expiry.encounterId)).toMatchObject({
      status,
      version: outcome === "expired" ? 2 : 1,
    });
    expect(await h.results.listByEncounter(expiry.encounterId)).toEqual([]);
    expect(await h.selections.listProposals(proposal.selectionId)).toEqual([proposal]);
    expect(h.selections.liveClaimKeys(proposal.selectionId)).toEqual(["ea-clubs:m-1"]);
    const expired = (await h.selections.listActions(expiry.encounterId)).filter(
      (a) => a.type === "confirmation_expired",
    );
    expect(
      expired.map((a) => ({
        actorId: a.actorId,
        capacity: a.capacity,
        at: a.occurredAt.toISOString(),
        details: a.details,
      })),
    ).toEqual(
      outcome === "expired"
        ? [
            {
              actorId: "actor-expiry",
              capacity: "system",
              at: "2026-10-04T20:00:00.000Z",
              details: {
                confirmationDeadline: "2026-10-04T20:00:00.000Z",
                processedAt: "2026-10-04T20:00:00.000Z",
              },
            },
          ]
        : [],
    );
    expect(h.eventNames()).toEqual(["results.official-matches-selected"]);
  });

  it("V21-12 rejects a late response and expires once when the runner catches up", async () => {
    const { h, expiry, response } = await pending();
    h.clockState.now = new Date("2026-10-04T21:00:00.000Z");
    const late = await h.useCases.confirm.execute(response);
    expect(late.isErr() ? late.error.code : "approved").toBe("results.confirmation_window_closed");
    h.clockState.now = new Date("2026-10-05T03:00:00.000Z");
    const first = await h.useCases.expire.execute(expiry);
    const replay = await h.useCases.expire.execute(expiry);
    expect(first.isOk() ? first.value : first.error.code).toEqual({ status: "expired" });
    expect(replay.isOk() ? replay.value : replay.error.code).toEqual({ status: "skipped" });
    expect(
      (await h.selections.listActions(expiry.encounterId)).map((a) => [
        a.type,
        a.occurredAt.toISOString(),
      ]),
    ).toEqual([
      ["proposed", "2026-10-03T20:00:00.000Z"],
      ["confirmation_expired", "2026-10-05T03:00:00.000Z"],
    ]);
    expect(await h.results.listByEncounter(expiry.encounterId)).toEqual([]);
  });

  it("V21-13/V21-15 gives a post-kickoff proposal 24h; V21-14 has no competitive limit in A", async () => {
    const { h, proposal, response } = await pending();
    expect(proposal.confirmationDeadline.toISOString()).toBe("2026-10-04T20:00:00.000Z");
    h.clockState.now = new Date("2026-10-03T20:00:00.001Z");
    const confirmed = await h.useCases.confirm.execute(response);
    expect(confirmed.isOk() ? confirmed.value.selection.status : confirmed.error.code).toBe(
      "approved",
    );
  });

  it.each([
    ["V21-16", "2026-10-05T11:59:59.999Z", "approved"],
    ["V21-17", "2026-10-05T12:00:00.000Z", "approved"],
    ["V21-18", "2026-10-06T10:59:59.999Z", "approved"],
    ["V21-19", "2026-10-06T11:00:00.000Z", "closed"],
  ] as const)("%s reopened proposal responds at %s with %s", async (_id, time, expected) => {
    const { h, expiry } = await pending();
    h.clockState.now = new Date("2026-10-05T10:00:00.000Z");
    await h.useCases.expire.execute(expiry);
    const returned = await h.useCases.resolve.execute({
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: 2,
      commandKey: "return",
      decision: { type: "return_to_selection" },
      reason: "Select again",
    });
    expect(returned.isOk() ? returned.value.selection.status : returned.error.code).toBe(
      "selection_in_progress",
    );
    h.clockState.now = new Date("2026-10-05T11:00:00.000Z");
    const next = await h.propose(["m-1"], { expectedVersion: 3 });
    if (!next.isOk() || !next.value.proposal) throw new Error("New proposal failed");
    expect(next.value.proposal).toMatchObject({
      round: 2,
      confirmationDeadline: new Date("2026-10-06T11:00:00.000Z"),
    });
    h.clockState.now = new Date(time);
    const outcome = await h.useCases.confirm.execute({
      ...h.base(),
      actorId: ACTORS.awayCaptain,
      actingTeamId: AWAY,
      proposalId: next.value.proposal.id,
      expectedVersion: 4,
      commandKey: "round-2-confirm",
    });
    expect(outcome.isOk() ? outcome.value.selection.status : outcome.error.code).toBe(
      expected === "closed" ? "results.confirmation_window_closed" : "approved",
    );
    expect(
      (await h.results.listByEncounter(expiry.encounterId)).map((r) => ({
        status: r.status,
        revision: r.revision,
      })),
    ).toEqual(expected === "closed" ? [] : [{ status: "approved", revision: 1 }]);
  });

  it.each(["reject", "alternative", "openDispute"] as const)(
    "%s observes the same boundary, including after expiry",
    async (command) => {
      for (const time of [
        "2026-10-04T19:59:59.999Z",
        "2026-10-04T20:00:00.000Z",
        "2026-10-04T20:00:00.001Z",
      ]) {
        const { h, response, expiry } = await pending();
        h.clockState.now = new Date(time);
        const run = () =>
          command === "reject"
            ? h.useCases.reject.execute({ ...response, reason: "Incorrect score" })
            : command === "alternative"
              ? h.useCases.alternative.execute({
                  ...response,
                  reason: "Different match",
                  selections: slotRefs("m-2"),
                })
              : h.useCases.openDispute.execute({ ...response, reason: "Review score" });
        const result = await run();
        const before = time === "2026-10-04T19:59:59.999Z";
        expect(result.isOk() ? result.value.selection.status : result.error.code).toBe(
          before ? "disputed" : "results.confirmation_window_closed",
        );
        expect(await h.results.listByEncounter(response.encounterId)).toEqual([]);
        if (!before) {
          await h.useCases.expire.execute(expiry);
          const afterExpiry = await run();
          expect(afterExpiry.isErr() ? afterExpiry.error.code : "disputed").toBe(
            "results.confirmation_window_closed",
          );
          expect((await h.selections.listActions(response.encounterId)).map((a) => a.type)).toEqual(
            ["proposed", "confirmation_expired"],
          );
        }
      }
    },
  );

  it("replays an on-time approval after the deadline without a second result", async () => {
    const { h, response, expiry } = await pending();
    h.clockState.now = new Date("2026-10-04T19:59:59.999Z");
    const approved = await h.useCases.confirm.execute(response);
    h.clockState.now = new Date("2026-10-05T03:00:00.000Z");
    const replay = await h.useCases.confirm.execute(response);
    expect(
      replay.isOk()
        ? { replayed: replay.value.replayed, resultId: replay.value.approvedResult?.id }
        : replay.error.code,
    ).toEqual({
      replayed: true,
      resultId: approved.isOk() ? approved.value.approvedResult?.id : null,
    });
    const expired = await h.useCases.expire.execute(expiry);
    expect(expired.isOk() ? expired.value : expired.error.code).toEqual({ status: "skipped" });
    expect((await h.selections.listActions(response.encounterId)).map((a) => a.type)).toEqual([
      "proposed",
      "confirmed",
      "approved",
    ]);
    expect((await h.results.listByEncounter(response.encounterId)).map((r) => r.revision)).toEqual([
      1,
    ]);
  });
});
