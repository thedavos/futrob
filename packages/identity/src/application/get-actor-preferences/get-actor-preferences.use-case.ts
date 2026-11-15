import type { ActorId } from "@futrob/shared-kernel";
import type { ActorPreferencesPort } from "../../domain/ports/actor-preferences.port.ts";
import {
  DEFAULT_SIDEBAR_LAYOUT,
  type ActorPreferences,
} from "../../domain/value-objects/actor-preferences.ts";

export interface GetActorPreferencesInput {
  readonly actorId: ActorId;
}

export class GetActorPreferencesUseCase {
  constructor(private readonly preferences: ActorPreferencesPort) {}

  async execute(input: GetActorPreferencesInput): Promise<ActorPreferences> {
    return (
      (await this.preferences.findByActor(input.actorId)) ?? {
        sidebarLayout: DEFAULT_SIDEBAR_LAYOUT,
      }
    );
  }
}
