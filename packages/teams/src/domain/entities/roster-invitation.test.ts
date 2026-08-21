import { describe, expect, it } from "vite-plus/test";
import { isRosterMembershipRole, ROSTER_INVITATION_STATUS } from "./roster-invitation.ts";

describe("roster invitation domain", () => {
  it("defines a closed set of invitation statuses", () => {
    expect(Object.values(ROSTER_INVITATION_STATUS)).toEqual([
      "pending",
      "accepted",
      "revoked",
      "expired",
    ]);
  });

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
