import { describe, expect, it } from "vite-plus/test";
import {
  isKnockoutFixtureStageKind,
  selectRescheduleStageRules,
} from "./select-reschedule-stage-rules.ts";

const regular = { band: "regular", allowRescheduling: false, maxReschedulesPerTeam: 1 };
const knockout = { band: "knockout", allowRescheduling: true, maxReschedulesPerTeam: 4 };

describe("selectRescheduleStageRules", () => {
  it("uses knockout rules for a knockout Encounter when both stages are configured", () => {
    expect(
      selectRescheduleStageRules({
        regularStage: regular,
        knockoutStage: knockout,
        stageKind: "knockout",
      }),
    ).toEqual(knockout);
  });

  it("uses regular rules for a league Encounter when both stages are configured", () => {
    expect(
      selectRescheduleStageRules({
        regularStage: regular,
        knockoutStage: knockout,
        stageKind: "league",
      }),
    ).toEqual(regular);
  });

  it("keeps the only configured band for single-stage competitions", () => {
    expect(
      selectRescheduleStageRules({
        regularStage: regular,
        knockoutStage: null,
        stageKind: "knockout",
      }),
    ).toEqual(regular);
    expect(
      selectRescheduleStageRules({
        regularStage: null,
        knockoutStage: knockout,
        stageKind: "league",
      }),
    ).toEqual(knockout);
  });

  it("fails closed when a mixed competition has no stage kind", () => {
    expect(
      selectRescheduleStageRules({
        regularStage: regular,
        knockoutStage: knockout,
        stageKind: null,
      }),
    ).toBeNull();
  });
});

describe("isKnockoutFixtureStageKind", () => {
  it("treats playoffs as knockout and groups as regular", () => {
    expect(isKnockoutFixtureStageKind("playoffs")).toBe(true);
    expect(isKnockoutFixtureStageKind("groups")).toBe(false);
  });
});
