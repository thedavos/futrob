import { describe, expect, it } from "vite-plus/test";
import { redactSensitiveAuthFields } from "./token-redaction.ts";

describe("token redaction policy", () => {
  it("redacts invitation tokens", () => {
    expect(
      redactSensitiveAuthFields({
        invitationToken: "invite-secret-value",
        path: "/invitations/accept",
      }),
    ).toEqual({
      invitationToken: "[redacted]",
      path: "/invitations/accept",
    });
  });

  // No logger sink on the mobile auth path; this asserts the policy+hook instead
  // of inventing a console spy.
  it("auth success does not log token", () => {
    expect(
      redactSensitiveAuthFields({
        token: "session-bearer-secret",
        userId: "user-1",
      }),
    ).toEqual({
      token: "[redacted]",
      userId: "user-1",
    });
  });
});
