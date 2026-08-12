import type { FixtureGenerationSpec } from "../entities/fixture-plan.ts";

export function fixtureGenerationKey(spec: FixtureGenerationSpec): string {
  return `${spec.competitionId}:rules:${spec.rulesVersion}:generation:${spec.generationVersion}:fp:${fixtureSpecFingerprint(spec)}`;
}

/** Hash of schedule inputs. Plan identity can change while generation_version occupies the competition. */
export function fixtureSpecFingerprint(spec: FixtureGenerationSpec): string {
  const groups = spec.groups ? `g${spec.groups.count}q${spec.groups.qualifiersPerGroup}` : "";
  const playoffs = spec.playoffs ? `p${spec.playoffs.teamCount}` : "";
  return fnv1aHex(
    [
      spec.format,
      spec.timeZone,
      spec.startsAt.toISOString(),
      String(spec.roundIntervalDays),
      spec.homeAndAway ? "ha1" : "ha0",
      `r${spec.officialMatchCounts.regular}k${spec.officialMatchCounts.knockout}`,
      spec.seed.join(","),
      groups,
      playoffs,
    ].join("|"),
  );
}

function fnv1aHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
