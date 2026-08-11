import type { EncounterId } from "./identifiers.ts";

export interface EncounterMutationLockPort {
  runExclusive<T>(encounterId: EncounterId, operation: () => Promise<T>): Promise<T>;
}
