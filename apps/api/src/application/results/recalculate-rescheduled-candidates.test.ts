import {
  CandidateDataUnavailable,
  EncounterNotFound,
  type RecalculateEncounterCandidatesInput,
} from "@futrob/results";
import type { AppliedScheduleChange, ScheduleChangeApplicationFeedPort } from "@futrob/scheduling";
import { asEncounterId, asOrganizationId, err, ok } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryCandidateRecalculationCheckpoints } from "@/adapters/results/candidate-recalculation-checkpoint.ts";
import { RecalculateRescheduledCandidates } from "./recalculate-rescheduled-candidates.ts";

class ArrayFeed implements ScheduleChangeApplicationFeedPort {
  readonly applications: AppliedScheduleChange[] = [];

  async listAppliedAfter(
    input: Parameters<ScheduleChangeApplicationFeedPort["listAppliedAfter"]>[0],
  ): Promise<readonly AppliedScheduleChange[]> {
    const key = (at: Date, id: string) => `${at.toISOString()}|${id}`;
    return this.applications
      .slice()
      .sort((left, right) =>
        key(left.appliedAt, left.applicationId) < key(right.appliedAt, right.applicationId)
          ? -1
          : 1,
      )
      .filter(
        (application) =>
          !input.after ||
          key(application.appliedAt, application.applicationId) >
            key(input.after.appliedAt, input.after.applicationId),
      )
      .slice(0, input.limit);
  }
}

function applied(id: string, appliedAt: string, encounter = `encounter-${id}`) {
  return {
    applicationId: id,
    requestId: `request-${id}`,
    organizationId: asOrganizationId("org-1"),
    encounterId: asEncounterId(encounter),
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
  const feed = new ArrayFeed();
  const checkpoints = new InMemoryCandidateRecalculationCheckpoints();
  const recalculated: string[] = [];
  const runner = new RecalculateRescheduledCandidates({
    feed,
    checkpoints,
    clock: { now: () => new Date("2026-10-06T12:00:00.000Z") },
    recalculate: {
      async execute(input) {
        recalculated.push(input.encounterId);
        const scripted = outcome(input);
        if (scripted === "missing") {
          return err(
            new EncounterNotFound({
              code: "results.encounter_not_found",
              message: "Encounter not found",
              encounterId: input.encounterId,
            }),
          );
        }
        if (scripted === "unavailable") return err(unavailable);
        return ok({ status: "associated", windows: [], associations: [] });
      },
    },
  });
  return { feed, checkpoints, recalculated, runner };
}

describe("RecalculateRescheduledCandidates", () => {
  it("recalculates every application across pages exactly once", async () => {
    const { feed, recalculated, runner } = harness();
    for (let index = 0; index < 51; index++) {
      feed.applications.push(
        applied(`a-${String(index).padStart(2, "0")}`, "2026-10-06T10:00:00.000Z"),
      );
    }

    const first = await runner.execute();
    const second = await runner.execute();

    expect(first.isOk() && first.value).toEqual({ recalculated: 51 });
    expect(new Set(recalculated).size).toBe(51);
    expect(second.isOk() && second.value).toEqual({ recalculated: 0 });
  });

  it("picks up an application that commits behind the checkpoint", async () => {
    const { feed, recalculated, runner } = harness();
    feed.applications.push(applied("late", "2026-10-06T10:05:00.000Z"));
    await runner.execute();

    feed.applications.push(applied("earlier", "2026-10-06T10:00:00.000Z"));
    const run = await runner.execute();

    expect(run.isOk() && run.value).toEqual({ recalculated: 1 });
    expect(recalculated).toEqual(["encounter-late", "encounter-earlier"]);
  });

  it("checkpoints a missing Encounter but stops before a transient failure", async () => {
    let providerDown = true;
    const { feed, checkpoints, recalculated, runner } = harness((input) =>
      input.encounterId === "encounter-gone"
        ? "missing"
        : providerDown && input.encounterId === "encounter-flaky"
          ? "unavailable"
          : "associated",
    );
    feed.applications.push(
      applied("gone", "2026-10-06T10:00:00.000Z"),
      applied("flaky", "2026-10-06T10:01:00.000Z"),
      applied("after", "2026-10-06T10:02:00.000Z"),
    );

    const failed = await runner.execute();

    expect(failed.isErr() && failed.error).toBe(unavailable);
    expect(
      [...checkpoints.rows.values()].map((row) => [row.application.applicationId, row.outcome]),
    ).toEqual([["gone", "encounter_not_found"]]);

    providerDown = false;
    const recovered = await runner.execute();

    expect(recovered.isOk() && recovered.value).toEqual({ recalculated: 2 });
    expect(recalculated).toEqual([
      "encounter-gone",
      "encounter-flaky",
      "encounter-flaky",
      "encounter-after",
    ]);
  });
});
