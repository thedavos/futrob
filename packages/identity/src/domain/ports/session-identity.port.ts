import type { ActorId } from "@futrob/shared-kernel";

/** Minimal Headers-like surface (avoids DOM lib in the identity package). */
export type RequestHeaders = {
  get(name: string): string | null;
};

/**
 * Resolves a trusted request session into a Futrob ActorId.
 * Application code must not read Better Auth tables directly.
 */
export interface SessionIdentityPort {
  resolveActorId(headers: RequestHeaders): Promise<ActorId | null>;
}
