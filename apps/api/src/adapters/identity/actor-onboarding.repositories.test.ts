import { describe, expect, it } from "vite-plus/test";
import type { ActorOnboardingPort } from "@futrob/identity";
import { asActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";

import { InMemoryActorOnboardingRepository } from "./in-memory-actor-onboarding.repository.ts";
import { PostgresActorOnboardingRepository } from "./postgres-actor-onboarding.repository.ts";

interface StoredRow {
  actor_id: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  onboarding_version: number | null;
  onboarding_path: "player" | "organization" | "invitation" | null;
  onboarding_current_step: "intention" | "game" | "invitation" | "game-account" | "review" | null;
}

class FakeActorOnboardingPool {
  private readonly rows = new Map<string, StoredRow>();

  async query(text: string, values: readonly unknown[]) {
    const actorId = String(values[0]);
    if (text.includes("SELECT actor_id")) {
      const row = this.rows.get(actorId);
      return { rows: row ? [row] : [] };
    }

    if (text.includes("VALUES ($1, FALSE")) {
      const existing = this.rows.get(actorId);
      if (!existing?.onboarding_completed) {
        this.rows.set(actorId, {
          actor_id: actorId,
          onboarding_completed: false,
          onboarding_completed_at: null,
          onboarding_version: null,
          onboarding_path: values[1] as StoredRow["onboarding_path"],
          onboarding_current_step: values[2] as StoredRow["onboarding_current_step"],
        });
      }
      return { rows: [] };
    }

    if (text.includes("VALUES ($1, TRUE")) {
      const existing = this.rows.get(actorId);
      if (!existing?.onboarding_completed) {
        this.rows.set(actorId, {
          actor_id: actorId,
          onboarding_completed: true,
          onboarding_completed_at: String(values[1]),
          onboarding_version: Number(values[2]),
          onboarding_path: values[3] as StoredRow["onboarding_path"],
          onboarding_current_step: null,
        });
      }
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${text}`);
  }
}

function repositoryCases(): Array<[string, () => ActorOnboardingPort]> {
  return [
    ["in-memory", () => new InMemoryActorOnboardingRepository()],
    [
      "Postgres",
      () => new PostgresActorOnboardingRepository(new FakeActorOnboardingPool() as unknown as Pool),
    ],
  ];
}

describe.each(repositoryCases())("actor onboarding %s repository", (_name, createRepository) => {
  it("saves, retrieves and completes progress while clearing the current step", async () => {
    const repository = createRepository();
    const actorId = asActorId("actor-resume");

    await repository.saveProgress({
      actorId,
      path: "player",
      currentStep: "game-account",
      updatedAt: new Date("2026-07-30T10:00:00.000Z"),
    });

    await expect(repository.findByActor(actorId)).resolves.toMatchObject({
      completed: false,
      path: "player",
      currentStep: "game-account",
    });

    await repository.saveCompleted({
      actorId,
      completedAt: new Date("2026-07-30T11:00:00.000Z"),
      version: 1,
      path: "player",
    });

    await expect(repository.findByActor(actorId)).resolves.toEqual({
      actorId,
      completed: true,
      completedAt: new Date("2026-07-30T11:00:00.000Z"),
      version: 1,
      path: "player",
      currentStep: null,
    });
  });
});
