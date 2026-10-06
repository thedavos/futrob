import {
  CandidateDataUnavailable,
  EncounterNotFound,
  type RecalculateEncounterCandidatesInput,
} from "@futrob/results";
import type { AppliedScheduleChange, ScheduleChangeApplicationFeedPort } from "@futrob/scheduling";
import { asEncounterId, asOrganizationId, err, ok } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { RecalculateRescheduledCandidates } from "./recalculate-rescheduled-candidates.ts";

/** `visible` holds committed applications; acknowledgements are kept per consumer. */
class VisibleFeed implements ScheduleChangeApplicationFeedPort {
  readonly visible: AppliedScheduleChange[] = [];
  readonly acknowledged = new Map<string, string[]>();

  async listUnacknowledged(
    input: Parameters<ScheduleChangeApplicationFeedPort["listUnacknowledged"]>[0],
  ): Promise<readonly AppliedScheduleChange[]> {
    const done = new Set(this.acknowledged.get(input.consumer) ?? []);
    return this.visible
      .filter((application) => !done.has(application.applicationId))
      .sort((left, right) => left.appliedAt.getTime() - right.appliedAt.getTime())
      .slice(0, input.limit);
  }

  async acknowledge(
    input: Parameters<ScheduleChangeApplicationFeedPort["acknowledge"]>[0],
  ): Promise<void> {
    const done = this.acknowledged.get(input.consumer) ?? [];
    if (!done.includes(input.applicationId)) done.push(input.applicationId);
    this.acknowledged.set(input.consumer, done);
  }
}

function applied(id: string, appliedAt: string): AppliedScheduleChange {
  return {
    applicationId: id,
    requestId: `request-${id}`,
    organizationId: asOrganizationId("org-1"),
    encounterId: asEncounterId(`encounter-${id}`),
    appliedAt: new Date(appliedAt),
  };
}

const unavailable = new CandidateDataUnavailable({
  code: "results.candidate_data_unavailable",
  message: "Candidate data is temporarily unavailable",
});

function harness(
  outcome: (
    input: RecalculateEncounterCandidatesInput,
  ) => "associated" | "missing" | "unavailable" = () => "associated",
) {
  const feed = new VisibleFeed();
  const recalculated: string[] = [];
  const runner = new RecalculateRescheduledCandidates({
    feed,
    clock: { now: () => new Date("2026-10-06T12:00:00.000Z") },
    recalculate: {
      async execute(input) {
        recalculated.push(input.encounterId);
        switch (outcome(input)) {
          case "missing":
            return err(
              new EncounterNotFound({
                code: "results.encounter_not_found",
                message: "Encounter not found",
                encounterId: input.encounterId,
              }),
            );
          case "unavailable":
            return err(unavailable);
          case "associated":
            return ok({ status: "associated", windows: [], associations: [] });
        }
      },
    },
  });
  const acknowledged = () => feed.acknowledged.get("results.candidate-recalculation") ?? [];
  return { feed, recalculated, runner, acknowledged };
}

describe("RecalculateRescheduledCandidates", () => {
  it("recalculates every application across pages exactly once", async () => {
    const { feed, recalculated, runner } = harness();
    for (let index = 0; index < 51; index++) {
      feed.visible.push(applied(`a-${String(index).padStart(2, "0")}`, "2026-10-06T10:00:00.000Z"));
    }

    const first = await runner.execute();
    const second = await runner.execute();

    expect(first.isOk() && first.value).toEqual({ recalculated: 51 });
    expect(new Set(recalculated).size).toBe(51);
    expect(second.isOk() && second.value).toEqual({ recalculated: 0 });
  });

  it("recalculates an application that commits long after a later one was handled", async () => {
    const { feed, recalculated, runner } = harness();
    const slow = applied("slow", "2026-10-06T10:00:00.000Z");
    // `slow` read its clock first but is still uncommitted while `fast`, an hour later, is handled.
    feed.visible.push(applied("fast", "2026-10-06T11:00:00.000Z"));
    await runner.execute();

    feed.visible.push(slow);
    const run = await runner.execute();

    expect(run.isOk() && run.value).toEqual({ recalculated: 1 });
    expect(recalculated).toEqual(["encounter-fast", "encounter-slow"]);
  });

  it("acknowledges a missing Encounter but stops before acknowledging a transient failure", async () => {
    let providerDown = true;
    const { feed, recalculated, runner, acknowledged } = harness((input) =>
      input.encounterId === "encounter-gone"
        ? "missing"
        : providerDown && input.encounterId === "encounter-flaky"
          ? "unavailable"
          : "associated",
    );
    feed.visible.push(
      applied("gone", "2026-10-06T10:00:00.000Z"),
      applied("flaky", "2026-10-06T10:01:00.000Z"),
      applied("after", "2026-10-06T10:02:00.000Z"),
    );

    const failed = await runner.execute();

    expect(failed.isErr() && failed.error).toBe(unavailable);
    expect(acknowledged()).toEqual(["gone"]);

    providerDown = false;
    const recovered = await runner.execute();

    expect(recovered.isOk() && recovered.value).toEqual({ recalculated: 2 });
    expect(acknowledged()).toEqual(["gone", "flaky", "after"]);
    expect(recalculated).toEqual([
      "encounter-gone",
      "encounter-flaky",
      "encounter-flaky",
      "encounter-after",
    ]);
  });
});
