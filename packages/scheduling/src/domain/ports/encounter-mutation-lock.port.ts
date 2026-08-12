import type { EncounterId } from "@futrob/shared-kernel";

export interface EncounterMutationLockPort {
  runExclusive<T>(encounterId: EncounterId, operation: () => Promise<T>): Promise<T>;
}
