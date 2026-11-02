import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import type { OnboardingStatusDto } from "@futrob/api-contracts";
import { handOffInvitationToOnboarding } from "./onboarding-invitation-handoff.ts";

const status = (completed: boolean): OnboardingStatusDto => ({
  completed,
  completedAt: completed ? "2026-11-01T00:00:00.000Z" : null,
  version: completed ? 3 : null,
  path: completed ? "player" : null,
  currentStep: completed ? null : "intention",
});

describe("handOffInvitationToOnboarding", () => {
  it("sends an actor who has not finished onboarding to the invitation path with the code", async () => {
    const caught = await handOffInvitationToOnboarding("invite-token", async () =>
      status(false),
    ).catch((error: unknown) => error);

    expect(isRedirect(caught)).toBe(true);
    expect(caught).toMatchObject({
      options: { to: "/onboarding/invitation", search: { invitation: "invite-token" } },
    });
  });

  it("lets a finished actor continue and fails when the status cannot be read", async () => {
    await expect(
      handOffInvitationToOnboarding("invite-token", async () => status(true)),
    ).resolves.toBeUndefined();
    await expect(
      handOffInvitationToOnboarding("invite-token", async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
  });
});
