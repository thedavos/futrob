import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type { ConfirmationAction, SelectionTransition } from "@futrob/results";

export function assertNextVersion(transition: SelectionTransition): void {
  if (transition.selection.version !== transition.expectedVersion + 1) {
    throw new Error(
      `Selection transition must carry version ${transition.expectedVersion + 1}, got ${transition.selection.version}`,
    );
  }
}

/** Sorted so concurrent transitions take reference claims in the same order. */
export function sortedUniqueReferences(refs: readonly ExternalReference[]): ExternalReference[] {
  const byKey = new Map(refs.map((ref) => [externalReferenceKey(ref), ref]));
  return [...byKey.values()].sort(
    (left, right) =>
      compareText(left.providerKey, right.providerKey) ||
      compareText(left.externalId, right.externalId),
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Moment the transition happened: claims are stamped with the first action's time. */
export function transitionTime(transition: SelectionTransition): Date {
  return transition.actions[0]?.occurredAt ?? transition.selection.updatedAt;
}

export function commandKeyIdentity(action: ConfirmationAction): string | null {
  if (action.commandKey === null) return null;
  return JSON.stringify([action.encounterId, action.actorId, action.commandKey, action.type]);
}
