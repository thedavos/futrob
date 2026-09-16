import type { FixtureStage } from "../entities/fixture-plan.ts";

export function isKnockoutFixtureStageKind(kind: FixtureStage["kind"]): boolean {
  switch (kind) {
    case "league":
    case "groups":
      return false;
    case "knockout":
    case "playoffs":
      return true;
    default: {
      const exhaustiveKind: never = kind;
      void exhaustiveKind;
      return false;
    }
  }
}

export function selectRescheduleStageRules<T>(input: {
  readonly regularStage: T | null;
  readonly knockoutStage: T | null;
  readonly stageKind: FixtureStage["kind"] | null;
}): T | null {
  const { regularStage, knockoutStage, stageKind } = input;
  if (regularStage == null) return knockoutStage;
  if (knockoutStage == null) return regularStage;
  if (stageKind == null) return null;
  return isKnockoutFixtureStageKind(stageKind) ? knockoutStage : regularStage;
}
