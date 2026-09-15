import { describe, expect, it } from "vite-plus/test";
import {
  authorization,
  input,
  source,
  sourceSnapshot,
  useCase,
} from "./generate-competition-fixture.test-harness.ts";

describe("GenerateCompetitionFixtureUseCase", () => {
  it("persists once and returns the existing fixture on replay", async () => {
    const harness = useCase();
    const first = await harness.useCase.execute(input());
    const replay = await harness.useCase.execute(input());

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isErr() || replay.isErr()) return;
    expect(replay.value).toEqual(first.value);
    expect(harness.fixtures.saves).toBe(1);
    expect(harness.events.map((event) => event.eventName)).toEqual([
      "scheduling.encounter-created",
    ]);
    expect(harness.snapshots.rows.size).toBe(1);
    expect(harness.matches.rows).toHaveLength(1);
  });

  it("rejects a corrected spec that reuses the same generation version", async () => {
    const harness = useCase();
    const first = await harness.useCase.execute(input());
    const shifted = await harness.useCase.execute({
      ...input(),
      startsAt: new Date("2026-09-08T01:00:00.000Z"),
      requestId: "request-2",
    });

    expect(first.isOk()).toBe(true);
    expect(shifted.isErr()).toBe(true);
    if (shifted.isOk()) return;
    expect(shifted.error.code).toBe("scheduling.fixture_generation_conflict");
    expect(harness.fixtures.saves).toBe(1);
  });

  it("supersedes the previous version and voids its official occupancy", async () => {
    const harness = useCase();
    const first = await harness.useCase.execute(input());
    const next = await harness.useCase.execute({ ...input(), generationVersion: 2 });

    expect(first.isOk()).toBe(true);
    expect(next.isOk()).toBe(true);
    if (first.isErr() || next.isErr()) return;
    expect(harness.fixtures.rows.get(first.value.id)?.status).toBe("superseded");
    expect(next.value.status).toBe("active");
    expect(
      await harness.snapshots.findById(first.value.stages[0]!.rounds[0]!.encounters[0]!.id),
    ).toBeNull();
    expect(harness.matches.rows.some((match) => match.status === "voided")).toBe(true);
    expect(harness.snapshots.rows.size).toBe(1);
  });

  it("refuses to supersede a fixture that already has approved official results", async () => {
    const harness = useCase({ occupancy: true });
    const first = await harness.useCase.execute(input());
    const next = await harness.useCase.execute({ ...input(), generationVersion: 2 });

    expect(first.isOk()).toBe(true);
    expect(next.isErr()).toBe(true);
    if (next.isOk()) return;
    expect(next.error.code).toBe("scheduling.fixture_supersede_conflict");
    expect(harness.fixtures.saves).toBe(1);
  });

  it("rejects a draft before persistence", async () => {
    const harness = useCase({ source: source({ status: "draft" }) });
    const result = await harness.useCase.execute(input());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_source_not_published");
    expect(harness.fixtures.saves).toBe(0);
  });

  it("requires scheduleManage permission", async () => {
    let sourceReads = 0;
    const harness = useCase({
      authorization: authorization(false),
      source: {
        load: async () => {
          sourceReads += 1;
          return sourceSnapshot;
        },
      },
    });
    const result = await harness.useCase.execute(input());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("authorization.forbidden");
    expect(harness.fixtures.saves).toBe(0);
    expect(sourceReads).toBe(0);
  });

  it("rolls back fixture persistence when event publication fails", async () => {
    const harness = useCase({
      publishMany: async () => {
        throw new Error("outbox unavailable");
      },
    });

    await expect(harness.useCase.execute(input())).rejects.toThrow("outbox unavailable");
    expect(harness.fixtures.rows.size).toBe(0);
    expect(harness.fixtures.saves).toBe(0);
  });
});
