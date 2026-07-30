import type { ActorOnboardingPort, CompletedOnboarding, OnboardingPath } from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";

export class PostgresActorOnboardingRepository implements ActorOnboardingPort {
  constructor(private readonly pool: Pool) {}

  async findCompletedByActor(actorId: ActorId): Promise<CompletedOnboarding | null> {
    const result = await this.pool.query(
      `SELECT actor_id, onboarding_completed_at, onboarding_version, onboarding_path
       FROM actor_onboarding
       WHERE actor_id = $1 AND onboarding_completed = TRUE`,
      [actorId],
    );
    const row = result.rows[0] as
      | {
          actor_id: string;
          onboarding_completed_at: Date | string;
          onboarding_version: number;
          onboarding_path: OnboardingPath;
        }
      | undefined;

    return row
      ? {
          actorId: asActorId(row.actor_id),
          completedAt: new Date(row.onboarding_completed_at),
          version: row.onboarding_version,
          path: row.onboarding_path,
        }
      : null;
  }

  async saveCompleted(onboarding: CompletedOnboarding): Promise<void> {
    const completedAt = onboarding.completedAt.toISOString();
    await this.pool.query(
      `INSERT INTO actor_onboarding (
         actor_id, onboarding_completed, onboarding_completed_at,
         onboarding_version, onboarding_path, created_at, updated_at
       ) VALUES ($1, TRUE, $2, $3, $4, $2, $2)
       ON CONFLICT (actor_id) DO UPDATE
       SET onboarding_completed = TRUE,
           onboarding_completed_at = EXCLUDED.onboarding_completed_at,
           onboarding_version = EXCLUDED.onboarding_version,
           onboarding_path = EXCLUDED.onboarding_path,
           updated_at = EXCLUDED.updated_at
       WHERE actor_onboarding.onboarding_completed = FALSE`,
      [onboarding.actorId, completedAt, onboarding.version, onboarding.path],
    );
  }
}
