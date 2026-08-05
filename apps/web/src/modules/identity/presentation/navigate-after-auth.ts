import type { NavigateOptions, RegisteredRouter } from "@tanstack/react-router";
import { organizationsBrowserClient } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";

type NavigateFn = (opts: NavigateOptions<RegisteredRouter>) => Promise<void> | void;

type HistoryLike = {
  readonly history: {
    push: (path: string) => void;
  };
};

export type AfterAuthKind = "login" | "signup";

/** Post-auth navigation policy for the auth tunnel. Forms stay unaware of invite paths. */
export async function navigateAfterAuth(input: {
  readonly kind: AfterAuthKind;
  readonly redirectTo: string | null | undefined;
  readonly navigate: NavigateFn;
  readonly router: HistoryLike;
}): Promise<void> {
  const redirectTo = resolveSafeRedirect(input.redirectTo);
  if (redirectTo) {
    input.router.history.push(redirectTo);
    return;
  }

  if (input.kind === "signup") {
    await input.navigate({ to: "/onboarding" });
    return;
  }

  try {
    const { destination } = await organizationsBrowserClient.resolvePostAuthDestination();
    if (destination.kind === "organization") {
      await input.navigate({
        to: "/orgs/$orgId",
        params: { orgId: destination.organizationId },
      });
      return;
    }
    if (destination.kind === "organizationPicker") {
      await input.navigate({ to: "/orgs" });
      return;
    }
    if (destination.kind === "personal") {
      await input.navigate({ to: "/player" });
      return;
    }
    await input.navigate({ to: "/onboarding" });
  } catch {
    await input.navigate({ to: "/onboarding" });
  }
}
