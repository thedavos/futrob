import { describe, expect, it } from "vite-plus/test";
import { isRosterMembershipRole } from "./roster-invitation.ts";

describe("roster invitation domain", () => {
  it.each(["player", "captain", "vice_captain"])(
    "accepts %s as a roster membership role",
    (role) => {
      expect(isRosterMembershipRole(role)).toBe(true);
    },
  );

  it.each(["owner", "coach", "", "Captain"])("rejects %s as a roster membership role", (role) => {
    expect(isRosterMembershipRole(role)).toBe(false);
  });
});
