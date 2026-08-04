import type {
  ActorOnboardingPort,
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingPath,
  OnboardingProgress,
  OnboardingStep,
} from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class PostgresActorOnboardingRepository implements ActorOnboardingPort {
  constructor(private readonly pool: Pool) {}

  async findByActor(actorId: ActorId): Promise<ActorOnboardingState | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT actor_id, onboarding_completed, onboarding_completed_at,
              onboarding_version, onboarding_path, onboarding_current_step
       FROM actor_onboarding
       WHERE actor_id = $1`,
      [actorId],
    );
    const row = result.rows[0] as
      | {
          actor_id: string;
          onboarding_completed: boolean;
          onboarding_completed_at: Date | string | null;
          onboarding_version: number | null;
          onboarding_path: OnboardingPath | null;
          onboarding_current_step: OnboardingStep | null;
        }
      | undefined;

    return row
      ? {
          actorId: asActorId(row.actor_id),
          completed: row.onboarding_completed,
          completedAt:
            row.onboarding_completed_at === null ? null : new Date(row.onboarding_completed_at),
          version: row.onboarding_version,
          path: row.onboarding_path,
          currentStep: row.onboarding_current_step,
        }
      : null;
  }

  async saveProgress(progress: OnboardingProgress): Promise<void> {
    const updatedAt = progress.updatedAt.toISOString();
    await getPgExecutor(this.pool).query(
      `INSERT INTO actor_onboarding (
         actor_id, onboarding_completed, onboarding_completed_at,
         onboarding_version, onboarding_path, onboarding_current_step,
         created_at, updated_at
       ) VALUES ($1, FALSE, NULL, NULL, $2, $3, $4, $4)
       ON CONFLICT (actor_id) DO UPDATE
       SET onboarding_path = EXCLUDED.onboarding_path,
           onboarding_current_step = EXCLUDED.onboarding_current_step,
           updated_at = EXCLUDED.updated_at
       WHERE actor_onboarding.onboarding_completed = FALSE`,
      [progress.actorId, progress.path, progress.currentStep, updatedAt],
    );
  }

  async saveCompleted(onboarding: CompletedOnboarding): Promise<void> {
    const completedAt = onboarding.completedAt.toISOString();
    await getPgExecutor(this.pool).query(
      `INSERT INTO actor_onboarding (
         actor_id, onboarding_completed, onboarding_completed_at,
         onboarding_version, onboarding_path, onboarding_current_step,
         created_at, updated_at
       ) VALUES ($1, TRUE, $2, $3, $4, NULL, $2, $2)
       ON CONFLICT (actor_id) DO UPDATE
       SET onboarding_completed = TRUE,
           onboarding_completed_at = EXCLUDED.onboarding_completed_at,
           onboarding_version = EXCLUDED.onboarding_version,
           onboarding_path = EXCLUDED.onboarding_path,
           onboarding_current_step = NULL,
           updated_at = EXCLUDED.updated_at
       WHERE actor_onboarding.onboarding_completed = FALSE`,
      [onboarding.actorId, completedAt, onboarding.version, onboarding.path],
    );
  }
}
