import { defaultStringifySearch, redirect } from "@tanstack/react-router";
import { z } from "zod";
import type { ExternalClubDto, PlayerExternalClubSelectionInputDto } from "@futrob/api-contracts";
import { competitionApplySearch } from "@/modules/competitions/presentation/explore/competition-apply-search.ts";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { StoredOnboarding } from "./onboarding-draft-storage.ts";
import { createEmptyDraft, type SelectedExternalClubDraft } from "./onboarding-draft.ts";

/**
 * A link that starts onboarding with something already chosen: an invitation code, an EA club
 * picked on the landing before signing up, an open competition to join (with that club, if
 * one was picked), or the intent to organize a competition.
 */
export type OnboardingHandoff =
  | Readonly<{ kind: "invitation"; code: string }>
  | Readonly<{ kind: "organizer" }>
  | Readonly<{ kind: "club"; locator: PlayerExternalClubSelectionInputDto }>
  | Readonly<{
      kind: "competition";
      competitionId: string;
      club: PlayerExternalClubSelectionInputDto | null;
    }>;

/** The handoff after its club was looked up for the signed-in actor; `null` when it failed. */
export type ResolvedOnboardingHandoff =
  | Extract<OnboardingHandoff, { kind: "invitation" | "organizer" }>
  | Readonly<{ kind: "club"; club: SelectedExternalClubDraft | null }>
  | Readonly<{
      kind: "competition";
      competitionId: string;
      club: SelectedExternalClubDraft | null;
    }>;

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
  intent: z.literal("organizer").optional().catch(undefined),
  competition: searchText(80),
  club: searchText(80),
  platform: searchText(40),
  edition: searchText(40),
});

export type OnboardingHandoffSearch = z.output<typeof onboardingHandoffSearchSchema>;

export function onboardingHandoffFromSearch(
  search: OnboardingHandoffSearch,
): OnboardingHandoff | null {
  const { invitation, intent, competition, club, platform, edition } = search;
  if (invitation) return { kind: "invitation", code: invitation };
  if (intent === "organizer") return { kind: "organizer" };
  const locator =
    club && platform && edition
      ? ({
          providerKey: "ea-clubs",
          externalClubId: club,
          platform,
          gameEdition: edition,
        } as const)
      : null;
  if (competition) return { kind: "competition", competitionId: competition, club: locator };
  return locator ? { kind: "club", locator } : null;
}

function clubSearch(locator: PlayerExternalClubSelectionInputDto) {
  return {
    club: locator.externalClubId,
    platform: locator.platform,
    edition: locator.gameEdition,
  };
}

export function onboardingHandoffLocation(handoff: OnboardingHandoff) {
  switch (handoff.kind) {
    case "invitation":
      return { to: "/onboarding/invitation", search: { invitation: handoff.code } } as const;
    case "organizer":
      return { to: "/onboarding/organization", search: { intent: "organizer" } } as const;
    case "club":
      return { to: "/onboarding/club", search: clubSearch(handoff.locator) } as const;
    case "competition": {
      const competition = handoff.competitionId;
      const search = handoff.club ? { competition, ...clubSearch(handoff.club) } : { competition };
      return { to: "/onboarding/review", search } as const;
    }
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
  switch (handoff.kind) {
    case "invitation":
    case "organizer":
      return handoff;
    case "club":
      return { kind: "club", club: await lookupSelectedClub(handoff.locator, lookupClub) };
    case "competition":
      return {
        kind: "competition",
        competitionId: handoff.competitionId,
        club: handoff.club ? await lookupSelectedClub(handoff.club, lookupClub) : null,
      };
  }
}

async function lookupSelectedClub(
  locator: PlayerExternalClubSelectionInputDto,
  lookupClub: (locator: PlayerExternalClubSelectionInputDto) => Promise<ExternalClubDto>,
): Promise<SelectedExternalClubDraft | null> {
  try {
    const { providerKey, externalClubId, platform, gameEdition, name, imageUrl } =
      await lookupClub(locator);
    return { providerKey, externalClubId, platform, gameEdition, name, imageUrl };
  } catch {
    return null;
  }
}

/**
 * Where an actor who already finished onboarding lands from a competition link: its detail with
 * the application open, the looked-up club name as the team name.
 */
export function competitionHandoffDestination(
  handoff: Extract<ResolvedOnboardingHandoff, { kind: "competition" }>,
) {
  return {
    to: "/player/competitions/$competitionId",
    params: { competitionId: handoff.competitionId },
    search: competitionApplySearch(handoff.club?.name ?? null),
  } as const;
}

/**
 * Where a handoff opens: the invitation step with the code filled in, the organization step, the
 * player review with the club selected (the club step when the lookup failed), or the player review set to join a
 * competition, with or without a club. A draft of the same path is kept.
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
    case "organizer": {
      const draft = stored?.path === "organization" ? stored.draft : createEmptyDraft();
      return { path: "organization", step: "organization", draft };
    }
    case "club": {
      const draft = stored?.path === "player" ? stored.draft : createEmptyDraft();
      return {
        path: "player",
        step: handoff.club ? "review" : "club",
        draft: { ...draft, selectedExternalClub: handoff.club, joiningCompetitionId: null },
      };
    }
    case "competition": {
      const draft = stored?.path === "player" ? stored.draft : createEmptyDraft();
      return {
        path: "player",
        step: "review",
        draft: {
          ...draft,
          selectedExternalClub: handoff.club ?? draft.selectedExternalClub,
          joiningCompetitionId: handoff.competitionId,
        },
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
