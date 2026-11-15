import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";

/** `/onboarding/invitation?invitation=<code>` opens the invitation path with the code filled in. */
export const onboardingInvitationSearchSchema = z.object({
  invitation: z.string().trim().min(1).optional(),
});

/**
 * An invitation link opened by an actor who has not finished onboarding continues inside the
 * invitation path, so accepting it also creates the personal profile and completes
 * onboarding (AC-ONB-001). If the status cannot be read it throws, so the link is not
 * redeemed outside onboarding.
 */
export async function handOffInvitationToOnboarding(
  token: string,
  getStatus = () => identityBrowserClient.getOnboardingStatus(),
): Promise<void> {
  const status = await getStatus();
  if (!status.completed) {
    throw redirect({ to: "/onboarding/invitation", search: { invitation: token }, replace: true });
  }
}
