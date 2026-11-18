import { defaultStringifySearch, redirect } from "@tanstack/react-router";
import { z } from "zod";
import type { ExternalClubDto, PlayerExternalClubSelectionInputDto } from "@futrob/api-contracts";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { StoredOnboarding } from "./onboarding-draft-storage.ts";
import { createEmptyDraft, type SelectedExternalClubDraft } from "./onboarding-draft.ts";

/**
 * A link that starts onboarding with something already chosen: an invitation code, or an EA
 * club picked on the landing before signing up.
 */
export type OnboardingHandoff =
  | Readonly<{ kind: "invitation"; code: string }>
  | Readonly<{ kind: "club"; locator: PlayerExternalClubSelectionInputDto }>;

/** The handoff after its club was looked up for the signed-in actor; `null` when it failed. */
export type ResolvedOnboardingHandoff =
  | Extract<OnboardingHandoff, { kind: "invitation" }>
  | Readonly<{ kind: "club"; club: SelectedExternalClubDraft | null }>;

// The router parses a bare numeric value such as an EA club id into a number.
const searchText = (max = Number.MAX_SAFE_INTEGER) =>
  z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().trim().min(1).max(max))
    .optional()
    .catch(undefined);

/** Search params of every onboarding route. A malformed value is dropped, never an error. */
export const onboardingHandoffSearchSchema = z.object({
  invitation: searchText(),
  club: searchText(80),
  platform: searchText(40),
  edition: searchText(40),
});

export type OnboardingHandoffSearch = z.output<typeof onboardingHandoffSearchSchema>;

export function onboardingHandoffFromSearch(
  search: OnboardingHandoffSearch,
): OnboardingHandoff | null {
  const { invitation, club, platform, edition } = search;
  if (invitation) return { kind: "invitation", code: invitation };
  if (club && platform && edition) {
    return {
      kind: "club",
      locator: { providerKey: "ea-clubs", externalClubId: club, platform, gameEdition: edition },
    };
  }
  return null;
}

export function onboardingHandoffLocation(handoff: OnboardingHandoff) {
  switch (handoff.kind) {
    case "invitation":
      return { to: "/onboarding/invitation", search: { invitation: handoff.code } } as const;
    case "club":
      return {
        to: "/onboarding/club",
        search: {
          club: handoff.locator.externalClubId,
          platform: handoff.locator.platform,
          edition: handoff.locator.gameEdition,
        },
      } as const;
  }
}

/** Same serialization as the router, so a numeric club id comes back as the same string. */
export function onboardingHandoffHref(handoff: OnboardingHandoff): string {
  const { to, search } = onboardingHandoffLocation(handoff);
  return `${to}${defaultStringifySearch(search)}`;
}

/** Looks the club up instead of trusting a name from the URL. A failed lookup selects nothing. */
export async function resolveOnboardingHandoff(
  handoff: OnboardingHandoff,
  lookupClub: (locator: PlayerExternalClubSelectionInputDto) => Promise<ExternalClubDto>,
): Promise<ResolvedOnboardingHandoff> {
  if (handoff.kind === "invitation") return handoff;
  try {
    const { providerKey, externalClubId, platform, gameEdition, name, imageUrl } = await lookupClub(
      handoff.locator,
    );
    return {
      kind: "club",
      club: { providerKey, externalClubId, platform, gameEdition, name, imageUrl },
    };
  } catch {
    return { kind: "club", club: null };
  }
}

/**
 * Where a handoff opens: the invitation step with the code filled in, or the player review with
 * the club selected (the club step when the lookup failed). A draft of the same path is kept.
 */
export function onboardingStateForHandoff(
  handoff: ResolvedOnboardingHandoff,
  stored: StoredOnboarding | null,
): StoredOnboarding {
  switch (handoff.kind) {
    case "invitation": {
      const draft = stored?.path === "invitation" ? stored.draft : createEmptyDraft();
      return {
        path: "invitation",
        step: "invitation",
        draft: { ...draft, invitationToken: handoff.code },
      };
    }
    case "club": {
      const draft = stored?.path === "player" ? stored.draft : createEmptyDraft();
      return {
        path: "player",
        step: handoff.club ? "review" : "club",
        draft: { ...draft, selectedExternalClub: handoff.club },
      };
    }
  }
}

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
    throw redirect({
      ...onboardingHandoffLocation({ kind: "invitation", code: token }),
      replace: true,
    });
  }
}
