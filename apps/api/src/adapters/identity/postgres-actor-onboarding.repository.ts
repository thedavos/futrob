import {
  ONBOARDING_STEPS,
  type ActorOnboardingPort,
  type ActorOnboardingState,
  type CompletedOnboarding,
  type OnboardingProgress,
} from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const onboardingPathSchema = z.enum(["player", "organization", "invitation"]);
const onboardingStepSchema = z.enum(ONBOARDING_STEPS);
const actorOnboardingRowSchema = z.object({
  actor_id: pgTextSchema,
  onboarding_completed: z.boolean(),
  onboarding_completed_at: pgTimestampSchema.nullable(),
  onboarding_version: z.coerce.number().nullable(),
  onboarding_path: onboardingPathSchema.nullable(),
  onboarding_current_step: onboardingStepSchema.nullable(),
});

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
    const row = result.rows[0];
    if (!row) return null;
    const parsed = actorOnboardingRowSchema.parse(row);

    return {
      actorId: asActorId(parsed.actor_id),
      completed: parsed.onboarding_completed,
      completedAt: parsed.onboarding_completed_at,
      version: parsed.onboarding_version,
      path: parsed.onboarding_path,
      currentStep: parsed.onboarding_current_step,
    };
  }

  async lockActor(actorId: ActorId): Promise<void> {
    await getPgExecutor(this.pool).query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
      `identity:onboarding:${actorId}`,
    ]);
  }

  async saveProgress(progress: OnboardingProgress): Promise<void> {
    const updatedAt = progress.updatedAt.toISOString();
    await getPgExecutor(this.pool).query(
      `WITH saved AS (
         INSERT INTO actor_onboarding (
           actor_id, onboarding_completed, onboarding_completed_at,
           onboarding_version, onboarding_path, onboarding_current_step,
           created_at, updated_at
         ) VALUES ($1, FALSE, NULL, NULL, $2, $3, $4, $4)
         ON CONFLICT (actor_id) DO UPDATE
         SET onboarding_path = EXCLUDED.onboarding_path,
             onboarding_current_step = EXCLUDED.onboarding_current_step,
             updated_at = EXCLUDED.updated_at
         WHERE actor_onboarding.onboarding_completed = FALSE
           AND (actor_onboarding.onboarding_path IS DISTINCT FROM EXCLUDED.onboarding_path
             OR actor_onboarding.onboarding_current_step
               IS DISTINCT FROM EXCLUDED.onboarding_current_step)
         RETURNING actor_id, onboarding_path, onboarding_current_step, updated_at
       )
       INSERT INTO actor_onboarding_events (
         actor_id, kind, onboarding_path, onboarding_step, onboarding_version, occurred_at
       )
       SELECT actor_id, 'step-entered', onboarding_path, onboarding_current_step, $5, updated_at
       FROM saved`,
      [progress.actorId, progress.path, progress.currentStep, updatedAt, progress.version],
    );
  }

  async saveCompleted(onboarding: CompletedOnboarding): Promise<void> {
    const completedAt = onboarding.completedAt.toISOString();
    await getPgExecutor(this.pool).query(
      `WITH saved AS (
         INSERT INTO actor_onboarding (
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
         WHERE actor_onboarding.onboarding_completed = FALSE
         RETURNING actor_id, onboarding_path, onboarding_version, onboarding_completed_at
       )
       INSERT INTO actor_onboarding_events (
         actor_id, kind, onboarding_path, onboarding_step, onboarding_version, occurred_at
       )
       SELECT actor_id, 'completed', onboarding_path, NULL, onboarding_version,
              onboarding_completed_at
       FROM saved`,
      [onboarding.actorId, completedAt, onboarding.version, onboarding.path],
    );
  }
}
