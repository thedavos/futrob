import type { ActorId, ClockPort } from "@futrob/shared-kernel";
import type { ActorPreferencesPort } from "../../domain/ports/actor-preferences.port.ts";
import type {
  ActorPreferences,
  SidebarLayout,
} from "../../domain/value-objects/actor-preferences.ts";

export interface SaveActorPreferencesInput {
  readonly actorId: ActorId;
  readonly sidebarLayout: SidebarLayout;
}

export class SaveActorPreferencesUseCase {
  constructor(
    private readonly preferences: ActorPreferencesPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: SaveActorPreferencesInput): Promise<ActorPreferences> {
    await this.preferences.save({
      actorId: input.actorId,
      sidebarLayout: input.sidebarLayout,
      updatedAt: this.clock.now(),
    });
    return { sidebarLayout: input.sidebarLayout };
  }
}
