import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type { OfficialSlotSelection } from "../entities/official-match-selection.ts";

export type SlotSelectionIssue =
  | { readonly kind: "count"; readonly expected: number; readonly received: number }
  | { readonly kind: "slots"; readonly expected: number; readonly received: number }
  | { readonly kind: "duplicate_reference"; readonly providerMatchRef: ExternalReference };

export type NormalizedSlots =
  | { readonly ok: true; readonly slots: readonly OfficialSlotSelection[] }
  | { readonly ok: false; readonly issue: SlotSelectionIssue };

/**
 * Validates a selection against the Encounter's slots: exactly one reference per
 * slot `1..count`, no repeated slot and no reference filling two slots. The array
 * order is irrelevant; the result is sorted by slot.
 */
export function normalizeSlotSelection(
  input: ReadonlyArray<{
    readonly officialSlot: number;
    readonly providerMatchRef: ExternalReference;
  }>,
  officialMatchCount: 1 | 2,
): NormalizedSlots {
  if (input.length !== officialMatchCount) {
    return {
      ok: false,
      issue: { kind: "count", expected: officialMatchCount, received: input.length },
    };
  }
  const slotNumbers = new Set(input.map((entry) => entry.officialSlot));
  const exact = Array.from({ length: officialMatchCount }, (_, index) => index + 1);
  if (slotNumbers.size !== input.length || !exact.every((slot) => slotNumbers.has(slot))) {
    return {
      ok: false,
      issue: { kind: "slots", expected: officialMatchCount, received: slotNumbers.size },
    };
  }
  const seen = new Set<string>();
  for (const entry of input) {
    const key = externalReferenceKey(entry.providerMatchRef);
    if (seen.has(key)) {
      return {
        ok: false,
        issue: { kind: "duplicate_reference", providerMatchRef: entry.providerMatchRef },
      };
    }
    seen.add(key);
  }
  const slots = [...input]
    .sort((left, right) => left.officialSlot - right.officialSlot)
    .map(
      (entry): OfficialSlotSelection => ({
        officialSlot: entry.officialSlot === 1 ? 1 : 2,
        providerMatchRef: {
          providerKey: entry.providerMatchRef.providerKey,
          externalId: entry.providerMatchRef.externalId,
        },
      }),
    );
  return { ok: true, slots };
}

/** Canonical form: same `(slot → reference)` pairs give the same key regardless of order. */
export function slotSelectionKey(slots: readonly OfficialSlotSelection[]): string {
  return [...slots]
    .sort((left, right) => left.officialSlot - right.officialSlot)
    .map((slot) => `${slot.officialSlot}=${externalReferenceKey(slot.providerMatchRef)}`)
    .join("|");
}

/** Swapping two references between slots is NOT equivalent. */
export function equivalentSlotSelections(
  left: readonly OfficialSlotSelection[],
  right: readonly OfficialSlotSelection[],
): boolean {
  return slotSelectionKey(left) === slotSelectionKey(right);
}

export function selectionReferences(slots: readonly OfficialSlotSelection[]): ExternalReference[] {
  return slots.map((slot) => slot.providerMatchRef);
}
