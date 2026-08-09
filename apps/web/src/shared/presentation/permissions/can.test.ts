import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { can, canAll, canAny } from "./can.ts";

describe("can", () => {
  it("returns true only when the permission is present", () => {
    const allowed = new Set([COMPETITION_PERMISSION.update, TEAM_PERMISSION.read]);
    expect(can(allowed, COMPETITION_PERMISSION.update)).toBe(true);
    expect(can(allowed, COMPETITION_PERMISSION.publish)).toBe(false);
  });

  it("returns false for an empty allowed set", () => {
    expect(can(new Set(), COMPETITION_PERMISSION.update)).toBe(false);
  });
});

describe("canAny / canAll", () => {
  const allowed = new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read]);

  it("canAny is true when at least one permission matches", () => {
    expect(canAny(allowed, [COMPETITION_PERMISSION.publish, COMPETITION_PERMISSION.update])).toBe(
      true,
    );
    expect(canAny(allowed, [COMPETITION_PERMISSION.publish])).toBe(false);
  });

  it("canAll is true only when every permission matches", () => {
    expect(canAll(allowed, [COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read])).toBe(
      true,
    );
    expect(canAll(allowed, [COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.publish])).toBe(
      false,
    );
  });
});
