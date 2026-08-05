import { describe, expect, it } from "vite-plus/test";
import {
  buildInvitationShareUrl,
  invitationAcceptPath,
  redactInvitationTokenFromPath,
} from "./invitation-share-url.ts";

describe("invitation share url", () => {
  it("builds the canonical path-param deep link", () => {
    expect(invitationAcceptPath("abc-TOKEN_01")).toBe("/invitations/accept/abc-TOKEN_01");
    expect(buildInvitationShareUrl("abc-TOKEN_01", "https://app.futrob.test")).toBe(
      "https://app.futrob.test/invitations/accept/abc-TOKEN_01",
    );
  });

  it("redacts tokens from pathnames for telemetry", () => {
    expect(redactInvitationTokenFromPath("/invitations/accept/secretToken")).toBe(
      "/invitations/accept/:token",
    );
    expect(redactInvitationTokenFromPath("/orgs/org-1")).toBe("/orgs/org-1");
  });
});
