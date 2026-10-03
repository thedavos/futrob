import { describe, expect, it } from "vite-plus/test";
import type { ExternalReference } from "@futrob/game-data";
import {
  equivalentSlotSelections,
  normalizeSlotSelection,
  selectionReferences,
  slotSelectionKey,
} from "./slot-selection.ts";

const ref = (externalId: string): ExternalReference => ({ providerKey: "ea-clubs", externalId });
const slot = (officialSlot: number, externalId: string) => ({
  officialSlot,
  providerMatchRef: ref(externalId),
});

describe("normalizeSlotSelection", () => {
  it("sorts by slot and ignores the order received", () => {
    const result = normalizeSlotSelection([slot(2, "b"), slot(1, "a")], 2);
    expect(
      result.ok && result.slots.map((s) => [s.officialSlot, s.providerMatchRef.externalId]),
    ).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
  });

  it("requires exactly the slots 1..count", () => {
    expect(normalizeSlotSelection([slot(1, "a")], 2)).toMatchObject({
      ok: false,
      issue: { kind: "count" },
    });
    expect(normalizeSlotSelection([slot(1, "a"), slot(1, "b")], 2)).toMatchObject({
      ok: false,
      issue: { kind: "slots" },
    });
    expect(normalizeSlotSelection([slot(2, "a")], 1)).toMatchObject({
      ok: false,
      issue: { kind: "slots" },
    });
    expect(normalizeSlotSelection([slot(3, "a"), slot(1, "b")], 2)).toMatchObject({
      ok: false,
      issue: { kind: "slots" },
    });
  });

  it("rejects a reference that fills two slots", () => {
    expect(normalizeSlotSelection([slot(1, "a"), slot(2, "a")], 2)).toMatchObject({
      ok: false,
      issue: { kind: "duplicate_reference" },
    });
  });
});

describe("slot selection equivalence", () => {
  it("is order-insensitive but slot-sensitive", () => {
    const a = [
      { officialSlot: 1 as const, providerMatchRef: ref("x") },
      { officialSlot: 2 as const, providerMatchRef: ref("y") },
    ];
    const reordered = [a[1]!, a[0]!];
    const swapped = [
      { officialSlot: 1 as const, providerMatchRef: ref("y") },
      { officialSlot: 2 as const, providerMatchRef: ref("x") },
    ];
    expect(equivalentSlotSelections(a, reordered)).toBe(true);
    expect(equivalentSlotSelections(a, swapped)).toBe(false);
    expect(slotSelectionKey(a)).toBe("1=ea-clubs:x|2=ea-clubs:y");
    expect(selectionReferences(a).map((r) => r.externalId)).toEqual(["x", "y"]);
  });
});
