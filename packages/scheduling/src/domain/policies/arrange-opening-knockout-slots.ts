import type { FixtureParticipantSlot } from "../entities/fixture-plan.ts";

type GroupRankSlot = Extract<FixtureParticipantSlot, { kind: "group-rank" }>;

/** Pads to a power of two. Byes sit at the front so `i` vs `n-1-i` never makes bye-vs-bye. */
export function arrangeOpeningKnockoutSlots(
  slots: readonly FixtureParticipantSlot[],
): FixtureParticipantSlot[] {
  const bracketSize = nextPowerOfTwo(Math.max(slots.length, 2));
  const arranged: FixtureParticipantSlot[] = Array.from({ length: bracketSize }, byeSlot);
  const byesNeeded = bracketSize - slots.length;

  if (slots.length > 0 && slots.every(isGroupRank)) {
    placeGroupRankSlots(arranged, slots, byesNeeded);
    return arranged;
  }

  slots.forEach((slot, index) => {
    arranged[byesNeeded + index] = slot;
  });
  return arranged;
}

function placeGroupRankSlots(
  arranged: FixtureParticipantSlot[],
  slots: readonly GroupRankSlot[],
  byesNeeded: number,
): void {
  const bracketSize = arranged.length;
  const placed = new Set<GroupRankSlot>();
  const pool = [...slots];

  const take = (
    position: number,
    opponentGroupId: string | undefined,
    prefer: (slot: GroupRankSlot) => boolean,
  ) => {
    const chosen =
      pool.find((slot) => !placed.has(slot) && prefer(slot) && slot.groupId !== opponentGroupId) ??
      pool.find((slot) => !placed.has(slot) && slot.groupId !== opponentGroupId) ??
      pool.find((slot) => !placed.has(slot));
    if (!chosen) return;
    arranged[position] = chosen;
    placed.add(chosen);
  };

  for (let index = 0; index < bracketSize / 2; index += 1) {
    const homePos = index;
    const awayPos = bracketSize - 1 - index;
    if (index < byesNeeded) {
      take(awayPos, undefined, (slot) => slot.rank === 1);
      continue;
    }
    take(homePos, undefined, (slot) => slot.rank === 1);
    const home = arranged[homePos];
    take(awayPos, home?.kind === "group-rank" ? home.groupId : undefined, (slot) => slot.rank > 1);
  }
}

function isGroupRank(slot: FixtureParticipantSlot): slot is GroupRankSlot {
  return slot.kind === "group-rank";
}

function byeSlot(): FixtureParticipantSlot {
  return { kind: "bye" };
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}
