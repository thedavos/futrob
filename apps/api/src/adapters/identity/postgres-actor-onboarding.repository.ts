import type {
  ActorOnboardingPort,
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingProgress,
} from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const onboardingPathSchema = z.enum(["player", "organization", "invitation"]);
const onboardingStepSchema = z.enum([
  "intention",
  "organization",
  "competition",
  "game",
  "invitation",
  "game-account",
  "club",
  "review",
]);
const actorOnboardingRowSchema = z.object({
  actor_id: pgTextSchema,
  onboarding_completed: z.boolean(),
  onboarding_completed_at: pgTimestampSchema.nullable(),
  onboarding_version: z.coerce.number().nullable(),
  onboarding_path: onboardingPathSchema.nullable(),
  onboarding_current_step: z
    .union([onboardingStepSchema, z.literal("team")])
    .nullable()
    .transform((step) => (step === "team" ? "club" : step)),
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
