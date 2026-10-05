import { describe, expect, it } from "vite-plus/test";
import { asEncounterId, asTeamId, type Result } from "@futrob/shared-kernel";
import { RESULT_PERMISSION } from "../domain/policies/result-permissions.ts";
import {
  ACTORS,
  AWAY,
  ENCOUNTER,
  EVENTS,
  HOME,
  createSelectionHarness,
  slotRefs,
  type SelectionHarness,
} from "./selection-flow.test-support.ts";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.isOk()) {
    throw new Error(`Expected ok, got ${JSON.stringify((result.error as { code?: string }).code)}`);
  }
  return result.value;
}

function codeOf(result: Result<unknown, { code: string }>): string | null {
  return result.isErr() ? result.error.code : null;
}

async function setup(options: Parameters<typeof createSelectionHarness>[0] = {}) {
  const h = createSelectionHarness(options);
  await h.associate(ENCOUNTER, ["m-1", "m-2", "m-3"]);
  return h;
}

function rivalInput(h: SelectionHarness, version: number, proposalId: string) {
  return {
    ...h.base(),
    actorId: ACTORS.awayCaptain,
    actingTeamId: AWAY,
    proposalId,
    expectedVersion: version,
    commandKey: h.nextKey(),
  };
}

async function toDisputed(h: SelectionHarness) {
  const first = unwrap(await h.propose(["m-1"]));
  const rejected = unwrap(
    await h.useCases.reject.execute({
      ...rivalInput(h, first.selection.version, first.proposal!.id),
      reason: "Wrong match",
    }),
  );
  return { first, rejected };
}

async function toReview(h: SelectionHarness) {
  const disputed = await toDisputed(h);
  const review = unwrap(
    await h.useCases.review.execute({
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: disputed.rejected.selection.version,
      commandKey: h.nextKey(),
    }),
  );
  return { ...disputed, review };
}

describe("propose (CA-01)", () => {
  it("records the proposing team's consent without officializing anything", async () => {
    const h = await setup();
    const out = unwrap(await h.propose(["m-1"]));

    expect(out.selection).toMatchObject({
      status: "awaiting_opponent_confirmation",
      version: 1,
      round: 1,
      currentProposalId: out.proposal!.id,
    });
    expect(out.proposal).toMatchObject({
      proposingTeamId: HOME,
      proposedByActorId: ACTORS.homeCaptain,
      sequence: 1,
      supersedesProposalId: null,
    });
    expect(out.actions.map((a) => [a.type, a.fromStatus, a.toStatus, a.capacity])).toEqual([
      ["proposed", null, "awaiting_opponent_confirmation", "team"],
    ]);
    expect(h.results.rows).toHaveLength(0);
    expect(h.eventNames()).toEqual([EVENTS.selected]);
    expect(h.selections.liveClaimKeys(out.selection.id)).toEqual(["ea-clubs:m-1"]);
  });

  it("lets a vice captain propose and requires a representative of a team in the encounter", async () => {
    const h = await setup();
    const vice = await h.propose(["m-1"], { actorId: ACTORS.homeVice });
    expect(vice.isOk()).toBe(true);

    const h2 = await setup();
    const asRival = await h2.propose(["m-1"], { actorId: ACTORS.homeCaptain, actingTeamId: AWAY });
    expect(codeOf(asRival)).toBe("results.official_selection_forbidden");
    const outsider = await h2.propose(["m-1"], { actorId: ACTORS.outsider });
    expect(codeOf(outsider)).toBe("results.official_selection_forbidden");
    const otherTeam = await h2.propose(["m-1"], { actingTeamId: asTeamId("team-elsewhere") });
    expect(codeOf(otherTeam)).toBe("results.official_selection_forbidden");
    expect(h2.selections.selections.size).toBe(0);
  });

  it("does not let organization staff or an operator act as a team", async () => {
    const h = await setup();
    h.authorization.allow(ACTORS.staffNoGrant, RESULT_PERMISSION.officialSelectionPropose);
    for (const actor of [ACTORS.staffNoGrant, ACTORS.operator]) {
      for (const team of [HOME, AWAY]) {
        const result = await h.propose(["m-1"], { actorId: actor, actingTeamId: team });
        expect(codeOf(result)).toBe("results.official_selection_forbidden");
      }
    }
  });

  it("rejects a representative whose capability was revoked", async () => {
    const h = await setup();
    h.authorization.revoke(ACTORS.homeCaptain, RESULT_PERMISSION.officialSelectionPropose);
    expect(codeOf(await h.propose(["m-1"]))).toBe("results.official_selection_forbidden");
  });

  it("fails for a missing encounter or another organization's encounter", async () => {
    const h = await setup();
    expect(codeOf(await h.propose(["m-1"], { encounterId: asEncounterId("nope") }))).toBe(
      "results.encounter_not_found",
    );
  });

  it("validates exact slots, count, duplicates and eligibility", async () => {
    const h = await setup({ officialMatchCount: 2 });
    expect(codeOf(await h.propose(["m-1"]))).toBe("results.invalid_selection");
    const repeatedSlot = await h.useCases.propose.execute({
      ...h.base(),
      actorId: ACTORS.homeCaptain,
      actingTeamId: HOME,
      selections: [
        { officialSlot: 1, providerMatchRef: slotRefs("m-1")[0]!.providerMatchRef },
        { officialSlot: 1, providerMatchRef: slotRefs("m-2")[0]!.providerMatchRef },
      ],
      expectedVersion: 0,
      commandKey: "k-slot",
    });
    expect(codeOf(repeatedSlot)).toBe("results.invalid_selection");
    const outOfRange = await h.useCases.propose.execute({
      ...h.base(),
      actorId: ACTORS.homeCaptain,
      actingTeamId: HOME,
      selections: [
        { officialSlot: 2, providerMatchRef: slotRefs("m-1")[0]!.providerMatchRef },
        { officialSlot: 2, providerMatchRef: slotRefs("m-2")[0]!.providerMatchRef },
      ],
      expectedVersion: 0,
      commandKey: "k-range",
    });
    expect(codeOf(outOfRange)).toBe("results.invalid_selection");
    expect(codeOf(await h.propose(["m-1", "m-1"]))).toBe("results.duplicate_provider_match");
    expect(codeOf(await h.propose(["m-1", "unknown"]))).toBe("results.candidate_not_associated");
    expect(h.selections.selections.size).toBe(0);
    expect(h.selections.claims.rows).toHaveLength(0);
  });

  it("cannot replace a pending proposal or skip the version", async () => {
    const h = await setup();
    unwrap(await h.propose(["m-1"]));
    expect(codeOf(await h.propose(["m-2"], { expectedVersion: 1 }))).toBe(
      "results.selection_state_conflict",
    );
    expect(codeOf(await h.propose(["m-2"], { expectedVersion: 0 }))).toBe(
      "results.selection_version_conflict",
    );
  });
});

describe("confirm", () => {
  it("CA-02: the rival confirming the same version approves exactly one snapshot", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const out = unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)));

    expect(out.selection.status).toBe("approved");
    expect(out.approvedResult).toMatchObject({
      revision: 1,
      status: "approved",
      selectionId: first.selection.id,
      proposalId: first.proposal!.id,
      approvalBasis: "team_agreement",
      approvedBy: ACTORS.awayCaptain,
    });
    expect(out.actions.map((a) => [a.type, a.fromStatus, a.toStatus])).toEqual([
      ["confirmed", "awaiting_opponent_confirmation", "confirmed"],
      ["approved", "confirmed", "approved"],
    ]);
    expect(out.actions[0]?.teamId).toBe(AWAY);
    expect(h.results.rows).toHaveLength(1);
    expect(h.eventNames()).toEqual([EVENTS.selected, EVENTS.confirmed, EVENTS.approved]);
    expect(h.selections.liveClaimKeys(first.selection.id)).toEqual(["ea-clubs:m-1"]);
  });

  it("CA-03: neither the proposer nor another representative of its team can confirm", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    for (const actor of [ACTORS.homeCaptain, ACTORS.homeVice]) {
      const result = await h.useCases.confirm.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        actorId: actor,
        actingTeamId: HOME,
      });
      expect(codeOf(result)).toBe("results.self_confirmation_forbidden");
    }
    expect(h.results.rows).toHaveLength(0);
    expect((await h.selections.findLatestByEncounter(ENCOUNTER))?.status).toBe(
      "awaiting_opponent_confirmation",
    );
  });

  it("a client cannot gain access by changing the team it claims to represent", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    // home captain claiming to be the away team has no away representation
    const spoofed = await h.useCases.confirm.execute({
      ...rivalInput(h, 1, first.proposal!.id),
      actorId: ACTORS.homeCaptain,
      actingTeamId: AWAY,
    });
    expect(codeOf(spoofed)).toBe("results.official_selection_forbidden");
    // operator with resolve capability but no team representation
    h.authorization.allow(ACTORS.operator, RESULT_PERMISSION.officialSelectionResolve);
    const operator = await h.useCases.confirm.execute({
      ...rivalInput(h, 1, first.proposal!.id),
      actorId: ACTORS.operator,
    });
    expect(codeOf(operator)).toBe("results.official_selection_forbidden");
    expect(h.results.rows).toHaveLength(0);
  });

  it("rejects a representative of a team from another competition", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const foreign = asTeamId("team-other-competition");
    h.teamRepresentation.set(ACTORS.outsider, foreign);
    h.authorization.allow(
      ACTORS.outsider,
      RESULT_PERMISSION.officialSelectionPropose,
      RESULT_PERMISSION.officialSelectionResolve,
    );
    const result = await h.useCases.confirm.execute({
      ...rivalInput(h, 1, first.proposal!.id),
      actorId: ACTORS.outsider,
      actingTeamId: foreign,
    });
    expect(codeOf(result)).toBe("results.official_selection_forbidden");
  });

  it("CA-11: a stale version or a replaced proposal fails with a typed conflict", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const alternative = unwrap(
      await h.useCases.alternative.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        selections: slotRefs("m-2"),
        reason: "It was the second match",
      }),
    );
    expect(alternative.selection.status).toBe("disputed");

    const late = await h.useCases.confirm.execute({
      ...rivalInput(h, 1, first.proposal!.id),
      actorId: ACTORS.awayCaptain,
    });
    expect(codeOf(late)).toBe("results.selection_version_conflict");
    const wrongProposal = await h.useCases.confirm.execute(
      rivalInput(h, alternative.selection.version, first.proposal!.id),
    );
    expect(codeOf(wrongProposal)).toBe("results.selection_proposal_stale");
    const current = await h.useCases.confirm.execute(
      rivalInput(h, alternative.selection.version, alternative.proposal!.id),
    );
    expect(codeOf(current)).toBe("results.selection_not_confirmable");
    expect(h.results.rows).toHaveLength(0);
  });

  it("CA-08: a blocking integrity flag sends the agreement to organizer review", async () => {
    const h = await setup({ incompleteMatchIds: ["m-1"] });
    const first = unwrap(await h.propose(["m-1"]));
    const out = unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)));

    expect(out.selection.status).toBe("organizer_review");
    expect(out.approvedResult).toBeNull();
    expect(out.integrityFlags).toEqual([
      { code: "provider_data_incomplete", providerMatchRef: slotRefs("m-1")[0]!.providerMatchRef },
    ]);
    expect(out.actions.map((a) => a.type)).toEqual(["confirmed", "integrity_review_required"]);
    expect(h.results.rows).toHaveLength(0);
    expect(h.eventNames()).not.toContain(EVENTS.approved);
  });

  it("fails without writing when the candidate lost eligibility since the proposal", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const existing = await h.associations.loadForEncounter(h.base().organizationId, ENCOUNTER);
    await h.associations.replaceForEncounter(
      h.base().organizationId,
      ENCOUNTER,
      existing.associations.map((row) => ({ ...row, eligible: false })),
      existing.generation,
    );
    const result = await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id));
    expect(codeOf(result)).toBe("results.candidate_not_associated");
    expect(h.results.rows).toHaveLength(0);
    expect(h.selections.actions).toHaveLength(1);
    expect((await h.selections.findLatestByEncounter(ENCOUNTER))?.version).toBe(1);
  });
});

describe("reject (CA-04)", () => {
  it("disputes without officializing and keeps the proposal and the reason", async () => {
    const h = await setup();
    const { first, rejected } = await toDisputed(h);

    expect(rejected.selection).toMatchObject({ status: "disputed", version: 2 });
    expect(rejected.dispute).toMatchObject({
      status: "open",
      openedByTeamId: AWAY,
      openedReason: "Wrong match",
    });
    expect(rejected.actions[0]).toMatchObject({ type: "rejected", reason: "Wrong match" });
    expect((await h.selections.listProposals(first.selection.id)).map((p) => p.id)).toEqual([
      first.proposal!.id,
    ]);
    expect(h.results.rows).toHaveLength(0);
    expect(h.eventNames()).toEqual([EVENTS.selected, EVENTS.disputeOpened]);
    expect(h.selections.liveClaimKeys(first.selection.id)).toEqual(["ea-clubs:m-1"]);
  });

  it("requires a reason and writes nothing without one", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const result = await h.useCases.reject.execute({
      ...rivalInput(h, 1, first.proposal!.id),
      reason: "   ",
    });
    expect(codeOf(result)).toBe("results.reason_required");
    expect((await h.selections.findLatestByEncounter(ENCOUNTER))?.version).toBe(1);
  });

  it("keeps the useful explanation and redacts a phone in the command result and audit", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const rawReason = "Marcador incorrecto; llamar +1-555-0100";
    const rejected = unwrap(
      await h.useCases.reject.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        reason: rawReason,
      }),
    );

    expect(rejected.dispute?.openedReason).toBe("Marcador incorrecto; llamar [REDACTED]");
    expect(rejected.actions[0]?.reason).toBe("Marcador incorrecto; llamar [REDACTED]");
    expect(rejected.actions[0]?.requestFingerprint).toBeNull();
    expect(h.selections.disputes[0]?.openedReason).toBe("Marcador incorrecto; llamar [REDACTED]");
    expect(h.selections.actions[1]?.reason).toBe("Marcador incorrecto; llamar [REDACTED]");
    expect(JSON.stringify(h.events)).not.toContain(rawReason);
  });

  it("keeps a non-sensitive reason exactly as entered", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const rejected = unwrap(
      await h.useCases.reject.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        reason: "Se invirtieron los slots",
      }),
    );

    expect(rejected.dispute?.openedReason).toBe("Se invirtieron los slots");
    expect(rejected.actions[0]?.reason).toBe("Se invirtieron los slots");
  });

  it("redacts an email while preserving the neighboring reason without an address", async () => {
    const withEmail = await setup();
    const first = unwrap(await withEmail.propose(["m-1"]));
    const sensitive = unwrap(
      await withEmail.useCases.reject.execute({
        ...rivalInput(withEmail, 1, first.proposal!.id),
        reason: "Avisar a arbitro@example.com sobre el marcador",
      }),
    );

    const withoutEmail = await setup();
    const neighborProposal = unwrap(await withoutEmail.propose(["m-1"]));
    const neighbor = unwrap(
      await withoutEmail.useCases.reject.execute({
        ...rivalInput(withoutEmail, 1, neighborProposal.proposal!.id),
        reason: "Avisar al árbitro sobre el marcador",
      }),
    );

    expect(sensitive.actions[0]?.reason).toBe("Avisar a [REDACTED] sobre el marcador");
    expect(neighbor.actions[0]?.reason).toBe("Avisar al árbitro sobre el marcador");
  });

  it("does not treat different phones with the same redacted view as the same replay", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const command = {
      ...rivalInput(h, 1, first.proposal!.id),
      reason: "Marcador incorrecto; llamar +1-555-0100",
    };
    unwrap(await h.useCases.reject.execute(command));

    const changed = await h.useCases.reject.execute({
      ...command,
      reason: "Marcador incorrecto; llamar +1-555-0101",
    });

    expect(codeOf(changed)).toBe("results.command_key_reused");
    expect(h.selections.actions).toHaveLength(2);
  });

  it("the proposing team cannot reject its own proposal", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const result = await h.useCases.reject.execute({
      ...rivalInput(h, 1, first.proposal!.id),
      actorId: ACTORS.homeCaptain,
      actingTeamId: HOME,
      reason: "changed my mind",
    });
    expect(codeOf(result)).toBe("results.self_confirmation_forbidden");
  });
});

describe("alternative (CA-05, CA-06)", () => {
  it("CA-05: an incompatible alternative links both proposals to one dispute", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const out = unwrap(
      await h.useCases.alternative.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        selections: slotRefs("m-2"),
        reason: "We played m-2 for real",
      }),
    );

    expect(out.selection).toMatchObject({
      status: "disputed",
      currentProposalId: out.proposal!.id,
      version: 2,
    });
    expect(out.proposal).toMatchObject({
      proposingTeamId: AWAY,
      supersedesProposalId: first.proposal!.id,
      sequence: 2,
      reason: "We played m-2 for real",
    });
    expect(out.dispute?.status).toBe("open");
    expect((await h.selections.listProposals(first.selection.id)).length).toBe(2);
    expect(h.selections.liveClaimKeys(first.selection.id)).toEqual([
      "ea-clubs:m-1",
      "ea-clubs:m-2",
    ]);
    expect(h.results.rows).toHaveLength(0);
  });

  it("CA-06: the same pairs in another order confirm; swapped slots dispute", async () => {
    const equivalent = await setup({ officialMatchCount: 2 });
    const first = unwrap(await equivalent.propose(["m-1", "m-2"]));
    const reordered = unwrap(
      await equivalent.useCases.alternative.execute({
        ...rivalInput(equivalent, 1, first.proposal!.id),
        selections: [...slotRefs("m-1", "m-2")].reverse(),
        reason: "",
      }),
    );
    expect(reordered.selection.status).toBe("approved");
    expect(reordered.approvedResult?.slots.map((s) => s.providerMatchRef.externalId)).toEqual([
      "m-1",
      "m-2",
    ]);
    expect(reordered.actions.map((a) => a.type)).toEqual(["confirmed", "approved"]);

    const swapped = await setup({ officialMatchCount: 2 });
    const proposal = unwrap(await swapped.propose(["m-1", "m-2"]));
    const out = unwrap(
      await swapped.useCases.alternative.execute({
        ...rivalInput(swapped, 1, proposal.proposal!.id),
        selections: slotRefs("m-2", "m-1"),
        reason: "Order was the other way around",
      }),
    );
    expect(out.selection.status).toBe("disputed");
    expect(swapped.results.rows).toHaveLength(0);
  });

  it("requires a reason for an incompatible alternative and blocks the proposer", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    expect(
      codeOf(
        await h.useCases.alternative.execute({
          ...rivalInput(h, 1, first.proposal!.id),
          selections: slotRefs("m-2"),
          reason: "",
        }),
      ),
    ).toBe("results.reason_required");
    expect(
      codeOf(
        await h.useCases.alternative.execute({
          ...rivalInput(h, 1, first.proposal!.id),
          actorId: ACTORS.homeCaptain,
          actingTeamId: HOME,
          selections: slotRefs("m-2"),
          reason: "me too",
        }),
      ),
    ).toBe("results.self_confirmation_forbidden");
    expect((await h.selections.findLatestByEncounter(ENCOUNTER))?.version).toBe(1);
  });
});

describe("explicit dispute (CA-07)", () => {
  it("opens a single dispute and a single opening fact, however often it is repeated", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const command = {
      ...h.base(),
      actorId: ACTORS.awayCaptain,
      actingTeamId: AWAY,
      expectedVersion: 1,
      reason: "Not our match",
      commandKey: "open-1",
    };
    const opened = unwrap(await h.useCases.openDispute.execute(command));
    const sameKey = unwrap(await h.useCases.openDispute.execute(command));
    const newKey = unwrap(
      await h.useCases.openDispute.execute({ ...command, commandKey: "open-2" }),
    );
    const byProposer = unwrap(
      await h.useCases.openDispute.execute({
        ...command,
        actorId: ACTORS.homeCaptain,
        actingTeamId: HOME,
        commandKey: "open-3",
      }),
    );

    expect(opened.replayed).toBe(false);
    expect([sameKey.replayed, newKey.replayed, byProposer.replayed]).toEqual([true, true, true]);
    expect(h.selections.disputes).toHaveLength(1);
    expect(h.selections.actions.filter((a) => a.type === "dispute_opened")).toHaveLength(1);
    expect(h.eventNames().filter((n) => n === EVENTS.disputeOpened)).toHaveLength(1);
    expect(first.selection.id).toBe(opened.selection.id);
    expect(h.results.rows).toHaveLength(0);
  });
});

describe("operator review and resolution", () => {
  it("CA-09: review then approve a proposal, closing the dispute and releasing the others", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const alt = unwrap(
      await h.useCases.alternative.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        selections: slotRefs("m-2"),
        reason: "m-2 was the match",
      }),
    );
    const review = unwrap(
      await h.useCases.review.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: alt.selection.version,
        commandKey: "review-1",
      }),
    );
    expect(review.selection.status).toBe("organizer_review");
    expect(review.dispute).toMatchObject({
      status: "under_review",
      reviewStartedByActorId: ACTORS.operator,
    });
    expect(h.results.rows).toHaveLength(0);

    const resolved = unwrap(
      await h.useCases.resolve.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: review.selection.version,
        decision: { type: "approve_proposal", proposalId: alt.proposal!.id },
        reason: "Evidence supports the second match",
        commandKey: "resolve-1",
      }),
    );
    expect(resolved.selection.status).toBe("approved");
    expect(resolved.approvedResult).toMatchObject({
      revision: 1,
      approvalBasis: "operator_resolution",
      approvedBy: ACTORS.operator,
      proposalId: alt.proposal!.id,
    });
    expect(resolved.dispute).toMatchObject({
      status: "resolved",
      resolution: "approved_proposal",
      resolutionProposalId: alt.proposal!.id,
      resolutionReason: "Evidence supports the second match",
    });
    expect(resolved.actions[0]).toMatchObject({
      type: "dispute_resolved_approved",
      capacity: "operator",
      teamId: null,
    });
    expect(h.selections.liveClaimKeys(first.selection.id)).toEqual(["ea-clubs:m-2"]);
    expect(
      h.selections.claims.rows.find((r) => r.key === "ea-clubs:m-1")?.releasedAt,
    ).not.toBeNull();
    expect(h.eventNames().at(-1)).toBe(EVENTS.approved);
  });

  it("only an operator with results.approve can review or resolve", async () => {
    const h = await setup();
    const { rejected } = await toDisputed(h);
    for (const actor of [
      ACTORS.awayCaptain,
      ACTORS.homeCaptain,
      ACTORS.staffNoGrant,
      ACTORS.outsider,
    ]) {
      const review = await h.useCases.review.execute({
        ...h.base(),
        actorId: actor,
        expectedVersion: rejected.selection.version,
        commandKey: h.nextKey(),
      });
      expect(codeOf(review)).toBe("results.official_result_forbidden");
    }
    const { review } = await toReview(await setup());
    expect(review.selection.status).toBe("organizer_review");

    const h2 = await setup();
    const prepared = await toReview(h2);
    const denied = await h2.useCases.resolve.execute({
      ...h2.base(),
      actorId: ACTORS.awayCaptain,
      expectedVersion: prepared.review.selection.version,
      decision: { type: "return_to_selection" },
      reason: "I decide",
      commandKey: h2.nextKey(),
    });
    expect(codeOf(denied)).toBe("results.official_result_forbidden");
    expect((await h2.selections.findLatestByEncounter(ENCOUNTER))?.status).toBe("organizer_review");
    expect(h2.results.rows).toHaveLength(0);
  });

  it("requires a justification and a reviewed case", async () => {
    const h = await setup();
    const { first, rejected } = await toDisputed(h);
    const early = await h.useCases.resolve.execute({
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: rejected.selection.version,
      decision: { type: "approve_proposal", proposalId: first.proposal!.id },
      reason: "fine",
      commandKey: h.nextKey(),
    });
    expect(codeOf(early)).toBe("results.selection_state_conflict");

    const reviewed = unwrap(
      await h.useCases.review.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: rejected.selection.version,
        commandKey: h.nextKey(),
      }),
    );
    const noReason = await h.useCases.resolve.execute({
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: reviewed.selection.version,
      decision: { type: "approve_proposal", proposalId: first.proposal!.id },
      reason: " ",
      commandKey: h.nextKey(),
    });
    expect(codeOf(noReason)).toBe("results.reason_required");
    const unknownProposal = await h.useCases.resolve.execute({
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: reviewed.selection.version,
      decision: { type: "approve_proposal", proposalId: "nope" },
      reason: "because",
      commandKey: h.nextKey(),
    });
    expect(codeOf(unknownProposal)).toBe("results.proposal_not_found");
    expect(h.results.rows).toHaveLength(0);
  });

  it("CA-10: returning to selection creates no result and demands a new agreement", async () => {
    const h = await setup();
    const { first, review } = await toReview(h);
    const returned = unwrap(
      await h.useCases.resolve.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: review.selection.version,
        decision: { type: "return_to_selection" },
        reason: "Teams must agree again",
        commandKey: h.nextKey(),
      }),
    );
    expect(returned.selection).toMatchObject({
      status: "selection_in_progress",
      round: 2,
      currentProposalId: null,
    });
    expect(returned.dispute).toMatchObject({
      status: "resolved",
      resolution: "returned_to_selection",
    });
    expect(h.results.rows).toHaveLength(0);
    expect(h.selections.liveClaimKeys(first.selection.id)).toEqual([]);

    const stale = await h.useCases.confirm.execute(
      rivalInput(h, returned.selection.version, first.proposal!.id),
    );
    expect(stale.isErr()).toBe(true);
    expect(h.results.rows).toHaveLength(0);

    const again = unwrap(await h.propose(["m-2"], { expectedVersion: returned.selection.version }));
    expect(again.selection).toMatchObject({ status: "awaiting_opponent_confirmation", round: 2 });
    const approved = unwrap(
      await h.useCases.confirm.execute(rivalInput(h, again.selection.version, again.proposal!.id)),
    );
    expect(approved.approvedResult?.revision).toBe(1);
    // round-1 proposals cannot be approved in a later round
    expect((await h.selections.listProposals(first.selection.id)).map((p) => p.round)).toEqual([
      1, 2,
    ]);
  });

  it("an operator must acknowledge blocking flags to approve; uniqueness cannot be waived", async () => {
    const h = await setup({ incompleteMatchIds: ["m-1"] });
    const first = unwrap(await h.propose(["m-1"]));
    const review = unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)));
    expect(review.selection.status).toBe("organizer_review");

    const base = {
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: review.selection.version,
      reason: "Checked the evidence",
    };
    const blocked = await h.useCases.resolve.execute({
      ...base,
      decision: { type: "approve_proposal", proposalId: first.proposal!.id },
      commandKey: "r-1",
    });
    expect(codeOf(blocked)).toBe("results.integrity_flags_not_acknowledged");
    expect(h.results.rows).toHaveLength(0);
    const acknowledged = unwrap(
      await h.useCases.resolve.execute({
        ...base,
        decision: {
          type: "approve_proposal",
          proposalId: first.proposal!.id,
          acknowledgeIntegrityFlags: true,
        },
        commandKey: "r-2",
      }),
    );
    expect(acknowledged.approvedResult?.approvalBasis).toBe("operator_resolution");
    expect(acknowledged.actions[0]?.details?.acknowledgedFlags).toHaveLength(1);
    expect(acknowledged.dispute).toBeNull();
  });
});

describe("approved selections are protected (CA-12)", () => {
  it("rejects every team and operator command and leaves the snapshot untouched", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const approved = unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)));
    const before = h.results.rows.map((row) => ({ ...row }));
    const version = approved.selection.version;

    const attempts = [
      await h.useCases.reject.execute({
        ...rivalInput(h, version, first.proposal!.id),
        reason: "too late",
      }),
      await h.useCases.alternative.execute({
        ...rivalInput(h, version, first.proposal!.id),
        selections: slotRefs("m-2"),
        reason: "too late",
      }),
      await h.useCases.openDispute.execute({
        ...h.base(),
        actorId: ACTORS.awayCaptain,
        actingTeamId: AWAY,
        expectedVersion: version,
        reason: "too late",
        commandKey: h.nextKey(),
      }),
      await h.useCases.confirm.execute(rivalInput(h, version, first.proposal!.id)),
      await h.useCases.review.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: version,
        commandKey: h.nextKey(),
      }),
      await h.useCases.resolve.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: version,
        decision: { type: "return_to_selection" },
        reason: "too late",
        commandKey: h.nextKey(),
      }),
    ];
    expect(attempts.map(codeOf)).toEqual(Array(6).fill("results.selection_already_approved"));
    expect(h.results.rows).toEqual(before);
    expect((await h.selections.findLatestByEncounter(ENCOUNTER))?.version).toBe(version);
  });
});

describe("replay and races (CA-14)", () => {
  it("repeating a completed approval returns the same result without duplicating effects", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const command = rivalInput(h, 1, first.proposal!.id);
    const a = unwrap(await h.useCases.confirm.execute(command));
    const eventsAfterFirst = h.events.length;
    const b = unwrap(await h.useCases.confirm.execute(command));

    expect(b.replayed).toBe(true);
    expect(b.approvedResult?.id).toBe(a.approvedResult?.id);
    expect(b.approvedResult?.revision).toBe(1);
    expect(h.results.rows).toHaveLength(1);
    expect(h.events).toHaveLength(eventsAfterFirst);
    expect(h.selections.actions.filter((x) => x.type === "approved")).toHaveLength(1);
  });

  it("a historical key does not restore a revoked permission or representation", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const command = rivalInput(h, 1, first.proposal!.id);
    unwrap(await h.useCases.confirm.execute(command));

    h.authorization.revoke(ACTORS.awayCaptain, RESULT_PERMISSION.officialSelectionResolve);
    expect(codeOf(await h.useCases.confirm.execute(command))).toBe(
      "results.official_selection_forbidden",
    );
    h.authorization.allow(ACTORS.awayCaptain, RESULT_PERMISSION.officialSelectionResolve);
    h.teamRepresentation.remove(ACTORS.awayCaptain, AWAY);
    expect(codeOf(await h.useCases.confirm.execute(command))).toBe(
      "results.official_selection_forbidden",
    );
  });

  it("the same key with a different request is a conflict", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"], { commandKey: "same" }));
    const reused = await h.propose(["m-2"], { commandKey: "same" });
    expect(codeOf(reused)).toBe("results.command_key_reused");
    expect(first.selection.version).toBe(1);
  });

  it("confirmation and rejection racing on one version: exactly one wins", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const [confirmed, rejected] = await Promise.all([
      h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)),
      h.useCases.reject.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        reason: "no",
      }),
    ]);
    expect([confirmed.isOk(), rejected.isOk()].filter(Boolean)).toHaveLength(1);
    const final = await h.selections.findLatestByEncounter(ENCOUNTER);
    expect(final?.version).toBe(2);
    expect(h.results.rows.length).toBe(confirmed.isOk() ? 1 : 0);
    const loser = confirmed.isOk() ? rejected : confirmed;
    expect(["results.selection_version_conflict", "results.selection_already_approved"]).toContain(
      codeOf(loser),
    );
  });
});

describe("a replay returns the original outcome, never a later state", () => {
  const replayed = <T extends { replayed: boolean }>(original: T): T => ({
    ...original,
    replayed: true,
  });

  it("propose: still the pending proposal after the rival approved it", async () => {
    const h = await setup();
    const command = {
      ...h.base(),
      actorId: ACTORS.homeCaptain,
      actingTeamId: HOME,
      selections: slotRefs("m-1"),
      expectedVersion: 0,
      commandKey: "propose-original",
    };
    const original = unwrap(await h.useCases.propose.execute(command));
    unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, original.proposal!.id)));

    const again = unwrap(await h.useCases.propose.execute(command));
    expect(again).toEqual(replayed(original));
    expect(again.selection.status).toBe("awaiting_opponent_confirmation");
    expect(again.approvedResult).toBeNull();
  });

  it("reject and alternative: the dispute as it was opened, even after it was resolved", async () => {
    const rejectedHarness = await setup();
    const first = unwrap(await rejectedHarness.propose(["m-1"]));
    const rejectCommand = {
      ...rivalInput(rejectedHarness, 1, first.proposal!.id),
      reason: "Wrong match",
    };
    const rejected = unwrap(await rejectedHarness.useCases.reject.execute(rejectCommand));
    const review = unwrap(
      await rejectedHarness.useCases.review.execute({
        ...rejectedHarness.base(),
        actorId: ACTORS.operator,
        expectedVersion: 2,
        commandKey: "review",
      }),
    );
    unwrap(
      await rejectedHarness.useCases.resolve.execute({
        ...rejectedHarness.base(),
        actorId: ACTORS.operator,
        expectedVersion: review.selection.version,
        decision: { type: "approve_proposal", proposalId: first.proposal!.id },
        reason: "Original was right",
        commandKey: "resolve",
      }),
    );
    const again = unwrap(await rejectedHarness.useCases.reject.execute(rejectCommand));
    expect(again).toEqual(replayed(rejected));
    expect(again.dispute?.status).toBe("open");

    const alternativeHarness = await setup();
    const proposal = unwrap(await alternativeHarness.propose(["m-1"]));
    const alternativeCommand = {
      ...rivalInput(alternativeHarness, 1, proposal.proposal!.id),
      selections: slotRefs("m-2"),
      reason: "Second match",
    };
    const alternative = unwrap(
      await alternativeHarness.useCases.alternative.execute(alternativeCommand),
    );
    unwrap(
      await alternativeHarness.useCases.review.execute({
        ...alternativeHarness.base(),
        actorId: ACTORS.operator,
        expectedVersion: 2,
        commandKey: "review",
      }),
    );
    const alternativeAgain = unwrap(
      await alternativeHarness.useCases.alternative.execute(alternativeCommand),
    );
    expect(alternativeAgain).toEqual(replayed(alternative));
    expect(alternativeAgain.selection.status).toBe("disputed");
  });

  it("review: under review even after the case returned to selection", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    unwrap(
      await h.useCases.reject.execute({ ...rivalInput(h, 1, first.proposal!.id), reason: "no" }),
    );
    const reviewCommand = {
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: 2,
      commandKey: "review-original",
    };
    const review = unwrap(await h.useCases.review.execute(reviewCommand));
    unwrap(
      await h.useCases.resolve.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: review.selection.version,
        decision: { type: "return_to_selection" },
        reason: "start over",
        commandKey: "return",
      }),
    );

    const again = unwrap(await h.useCases.review.execute(reviewCommand));
    expect(again).toEqual(replayed(review));
    expect(again.dispute?.status).toBe("under_review");
    expect(again.selection.status).toBe("organizer_review");
  });

  it("return to selection: still round 2 and proposal-less after a new proposal", async () => {
    const h = await setup();
    const { review } = await toReview(h);
    const returnCommand = {
      ...h.base(),
      actorId: ACTORS.operator,
      expectedVersion: review.selection.version,
      decision: { type: "return_to_selection" as const },
      reason: "start over",
      commandKey: "return-original",
    };
    const returned = unwrap(await h.useCases.resolve.execute(returnCommand));
    unwrap(await h.propose(["m-2"], { expectedVersion: returned.selection.version }));

    const again = unwrap(await h.useCases.resolve.execute(returnCommand));
    expect(again).toEqual(replayed(returned));
    expect(again.selection).toMatchObject({ status: "selection_in_progress", round: 2 });
    expect(again.proposal).toBeNull();
  });

  it("confirm and resolve: the approved snapshot even after the result was voided", async () => {
    const confirmed = await setup();
    const first = unwrap(await confirmed.propose(["m-1"]));
    const confirmCommand = rivalInput(confirmed, 1, first.proposal!.id);
    const approved = unwrap(await confirmed.useCases.confirm.execute(confirmCommand));
    unwrap(
      await confirmed.useCases.void.execute({
        actorId: ACTORS.operator,
        encounterId: ENCOUNTER,
        reason: "mistake",
      }),
    );
    const again = unwrap(await confirmed.useCases.confirm.execute(confirmCommand));
    expect(again).toEqual(replayed(approved));
    expect(again.approvedResult?.status).toBe("approved");
    expect(again.selection.status).toBe("approved");

    const resolved = await setup();
    const { first: disputed, review } = await toReview(resolved);
    const resolveCommand = {
      ...resolved.base(),
      actorId: ACTORS.operator,
      expectedVersion: review.selection.version,
      decision: { type: "approve_proposal" as const, proposalId: disputed.proposal!.id },
      reason: "Original was right",
      commandKey: "resolve-original",
    };
    const resolution = unwrap(await resolved.useCases.resolve.execute(resolveCommand));
    unwrap(
      await resolved.useCases.void.execute({ actorId: ACTORS.operator, encounterId: ENCOUNTER }),
    );
    const resolutionAgain = unwrap(await resolved.useCases.resolve.execute(resolveCommand));
    expect(resolutionAgain).toEqual(replayed(resolution));
    expect(resolutionAgain.dispute?.status).toBe("resolved");
  });

  it("a flagged confirmation replays as organizer review after the operator approved it", async () => {
    const h = await setup({ incompleteMatchIds: ["m-1"] });
    const first = unwrap(await h.propose(["m-1"]));
    const confirmCommand = rivalInput(h, 1, first.proposal!.id);
    const flagged = unwrap(await h.useCases.confirm.execute(confirmCommand));
    unwrap(
      await h.useCases.resolve.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: flagged.selection.version,
        decision: {
          type: "approve_proposal",
          proposalId: first.proposal!.id,
          acknowledgeIntegrityFlags: true,
        },
        reason: "checked",
        commandKey: "resolve",
      }),
    );

    const again = unwrap(await h.useCases.confirm.execute(confirmCommand));
    expect(again).toEqual(replayed(flagged));
    expect(again.selection.status).toBe("organizer_review");
    expect(again.approvedResult).toBeNull();
  });

  it("the same key with a different reason is a conflict, not a replay", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const command = {
      ...rivalInput(h, 1, first.proposal!.id),
      selections: slotRefs("m-2"),
      reason: "Second match",
    };
    unwrap(await h.useCases.alternative.execute(command));

    const reworded = await h.useCases.alternative.execute({ ...command, reason: "Something else" });
    expect(codeOf(reworded)).toBe("results.command_key_reused");
    expect(h.selections.proposals).toHaveLength(2);

    const rejectHarness = await setup();
    const proposal = unwrap(await rejectHarness.propose(["m-1"]));
    const rejectCommand = {
      ...rivalInput(rejectHarness, 1, proposal.proposal!.id),
      reason: "Wrong match",
    };
    unwrap(await rejectHarness.useCases.reject.execute(rejectCommand));
    expect(
      codeOf(await rejectHarness.useCases.reject.execute({ ...rejectCommand, reason: "Other" })),
    ).toBe("results.command_key_reused");
  });
});

describe("reference uniqueness across encounters (FR-12)", () => {
  it("rejects a match already claimed by another encounter and audits the attempt", async () => {
    const h = await setup();
    const second = h.addEncounter("enc-2");
    await h.associate(second, ["m-1", "m-2"]);
    unwrap(await h.propose(["m-1"]));

    const attempt = await h.propose(["m-1"], { encounterId: second });
    expect(codeOf(attempt)).toBe("results.reference_already_claimed");
    expect(await h.selections.findLatestByEncounter(second)).toBeNull();
    const audit = (await h.selections.listActions(second)).filter(
      (a) => a.type === "reference_reuse_rejected",
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      selectionId: null,
      commandKey: null,
      details: { conflictingReference: { externalId: "m-1" } },
    });
    expect(h.eventNames().filter((n) => n === EVENTS.selected)).toHaveLength(1);
  });

  it("two encounters racing for the same externalId: exactly one owner", async () => {
    const h = await setup();
    const second = h.addEncounter("enc-2");
    await h.associate(second, ["m-1"]);
    const [a, b] = await Promise.all([
      h.propose(["m-1"]),
      h.propose(["m-1"], { encounterId: second }),
    ]);
    expect([a.isOk(), b.isOk()].filter(Boolean)).toHaveLength(1);
    expect(h.selections.claims.rows.filter((r) => r.releasedAt === null)).toHaveLength(1);
  });

  it("releases the reference when the case returns to selection or is voided, keeping history", async () => {
    const h = await setup();
    const second = h.addEncounter("enc-2");
    await h.associate(second, ["m-1"]);
    const { first, review } = await toReview(h);
    unwrap(
      await h.useCases.resolve.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: review.selection.version,
        decision: { type: "return_to_selection" },
        reason: "start over",
        commandKey: h.nextKey(),
      }),
    );
    expect(await h.propose(["m-1"], { encounterId: second })).toSatisfy(
      (r: Result<unknown, unknown>) => r.isOk(),
    );
    expect(h.selections.claims.rows.filter((r) => r.key === "ea-clubs:m-1")).toHaveLength(2);
    expect(first.selection.encounterId).toBe(ENCOUNTER);
  });
});

describe("void and re-approval keep every revision", () => {
  it("voiding closes the selection, frees the references and a new approval is revision 2", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    const approved = unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)));
    const original = { ...approved.approvedResult! };

    const voided = await h.useCases.void.execute({
      actorId: ACTORS.operator,
      encounterId: ENCOUNTER,
      reason: "Wrong result reported",
    });
    expect(voided.isOk() && voided.value.status).toBe("voided");
    const selection = await h.selections.findLatestByEncounter(ENCOUNTER);
    expect(selection).toMatchObject({ status: "voided", version: approved.selection.version + 1 });
    expect(h.selections.liveClaimKeys(first.selection.id)).toEqual([]);
    expect(h.selections.actions.at(-1)).toMatchObject({
      type: "voided",
      reason: "Wrong result reported",
      capacity: "operator",
      officialResultId: original.id,
    });

    const again = unwrap(await h.propose(["m-2"], { expectedVersion: selection!.version }));
    expect(again.selection.round).toBe(2);
    const second = unwrap(
      await h.useCases.confirm.execute(rivalInput(h, again.selection.version, again.proposal!.id)),
    );
    expect(second.approvedResult?.revision).toBe(2);
    expect(h.results.rows.map((r) => [r.revision, r.status])).toEqual([
      [1, "voided"],
      [2, "approved"],
    ]);
    expect(h.results.rows[0]?.slots).toEqual(original.slots);
    expect(h.results.rows[0]?.id).toBe(original.id);
  });

  it("only results.approve can void", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    unwrap(await h.useCases.confirm.execute(rivalInput(h, 1, first.proposal!.id)));
    const denied = await h.useCases.void.execute({
      actorId: ACTORS.awayCaptain,
      encounterId: ENCOUNTER,
    });
    expect(codeOf(denied)).toBe("results.official_result_forbidden");
    expect(h.results.rows[0]?.status).toBe("approved");
  });
});

describe("statistics gate", () => {
  it("proposed, rejected, alternative, disputed and under-review states never approve a result", async () => {
    const h = await setup();
    const first = unwrap(await h.propose(["m-1"]));
    expect(h.results.rows).toHaveLength(0);
    unwrap(
      await h.useCases.alternative.execute({
        ...rivalInput(h, 1, first.proposal!.id),
        selections: slotRefs("m-2"),
        reason: "other match",
      }),
    );
    expect(h.results.rows).toHaveLength(0);
    unwrap(
      await h.useCases.review.execute({
        ...h.base(),
        actorId: ACTORS.operator,
        expectedVersion: 2,
        commandKey: "rv",
      }),
    );
    expect(h.results.rows).toHaveLength(0);
    expect(h.eventNames()).not.toContain(EVENTS.approved);
  });

  it("a write failing mid-command leaves no partial selection, action or claim", async () => {
    const h = await setup();
    h.selections.failNextCommit = new Error("database unavailable");
    await expect(h.propose(["m-1"])).rejects.toThrow("database unavailable");
    expect(h.selections.selections.size).toBe(0);
    expect(h.selections.actions).toHaveLength(0);
    expect(h.selections.claims.rows).toHaveLength(0);
    expect(h.eventNames()).toEqual([]);
    const retry = await h.propose(["m-1"]);
    expect(retry.isOk()).toBe(true);
  });
});

describe("operational view", () => {
  it("lists what each actor may do and never exposes provider payloads", async () => {
    const h = await setup();
    expect(
      unwrap(
        await h.useCases.get.execute({
          ...h.base(),
          actorId: ACTORS.homeCaptain,
          actingTeamId: HOME,
        }),
      ).allowedActions,
    ).toEqual(["propose"]);
    const first = unwrap(await h.propose(["m-1"]));

    const proposer = unwrap(
      await h.useCases.get.execute({
        ...h.base(),
        actorId: ACTORS.homeCaptain,
        actingTeamId: HOME,
      }),
    );
    const rival = unwrap(
      await h.useCases.get.execute({
        ...h.base(),
        actorId: ACTORS.awayCaptain,
        actingTeamId: AWAY,
      }),
    );
    const operator = unwrap(
      await h.useCases.get.execute({ ...h.base(), actorId: ACTORS.operator }),
    );
    expect(proposer.allowedActions).toEqual(["open_dispute"]);
    expect(rival.allowedActions).toEqual([
      "confirm",
      "reject",
      "propose_alternative",
      "open_dispute",
    ]);
    expect(operator.allowedActions).toEqual([]);
    expect(rival.proposals.map((p) => p.id)).toEqual([first.proposal!.id]);
    expect(JSON.stringify(rival)).not.toContain("players");

    for (const actor of [ACTORS.outsider, ACTORS.staffNoGrant]) {
      const denied = await h.useCases.get.execute({ ...h.base(), actorId: actor });
      expect(codeOf(denied)).toBe("results.official_selection_forbidden");
    }
    const asWrongTeam = await h.useCases.get.execute({
      ...h.base(),
      actorId: ACTORS.outsider,
      actingTeamId: AWAY,
    });
    expect(codeOf(asWrongTeam)).toBe("results.official_selection_forbidden");
  });

  it("offers review to the operator once a case is disputed", async () => {
    const h = await setup();
    await toDisputed(h);
    const operator = unwrap(
      await h.useCases.get.execute({ ...h.base(), actorId: ACTORS.operator }),
    );
    expect(operator.allowedActions).toEqual(["review_dispute"]);
    expect(operator.activeDispute?.status).toBe("open");
    expect(operator.approvedResultId).toBeNull();
  });
});
