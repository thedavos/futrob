import {
  type ActorOnboardingPort,
  CompleteOnboardingUseCase,
  GetOnboardingStatusUseCase,
  SaveOnboardingProgressUseCase,
} from "@futrob/identity";
import type { ClockPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  InMemoryActorContactReader,
  PostgresActorContactReader,
} from "@/adapters/identity/actor-contact.reader.ts";
import { InMemoryActorOnboardingRepository } from "@/adapters/identity/in-memory-actor-onboarding.repository.ts";
import { PostgresActorOnboardingRepository } from "@/adapters/identity/postgres-actor-onboarding.repository.ts";

export interface IdentityModuleDependencies {
  readonly pool: Pool | undefined;
}

export function createIdentityModule(deps: IdentityModuleDependencies) {
  const actorOnboarding: ActorOnboardingPort = deps.pool
    ? new PostgresActorOnboardingRepository(deps.pool)
    : new InMemoryActorOnboardingRepository();
  const contacts = deps.pool
    ? new PostgresActorContactReader(deps.pool)
    : new InMemoryActorContactReader();
  const clock: ClockPort = { now: () => new Date() };

  return {
    getOnboardingStatus: new GetOnboardingStatusUseCase(actorOnboarding),
    saveOnboardingProgress: new SaveOnboardingProgressUseCase(actorOnboarding, clock),
    completeOnboarding: new CompleteOnboardingUseCase(actorOnboarding, clock),
    contacts,
  };
}

export type IdentityModule = ReturnType<typeof createIdentityModule>;
