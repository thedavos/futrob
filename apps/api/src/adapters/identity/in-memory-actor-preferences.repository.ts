import type {
  ActorPreferences,
  ActorPreferencesPort,
  ActorPreferencesUpdate,
} from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";

export class InMemoryActorPreferencesRepository implements ActorPreferencesPort {
  private readonly byActor = new Map<string, ActorPreferences>();

  async findByActor(actorId: ActorId): Promise<ActorPreferences | null> {
    return this.byActor.get(actorId) ?? null;
  }

  async save(update: ActorPreferencesUpdate): Promise<void> {
    this.byActor.set(update.actorId, { sidebarLayout: update.sidebarLayout });
  }
}
