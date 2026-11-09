import { useMemo } from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import type {
  ExternalClubAssociationOutcomeDto,
  OnboardingPathDto,
  OnboardingStatusDto,
  OnboardingStepDto,
} from "@futrob/api-contracts";
import { EA_SEARCH_PLATFORM } from "@futrob/api-contracts";
import type { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { ClubAssociationNotice } from "@/modules/player-home/presentation/club-association-notice.tsx";
import { playerHomeSearchSchema } from "@/modules/player-home/presentation/player-home-search.ts";
import type { OnboardingGateway } from "./onboarding-flow-gateway.ts";
import { OnboardingFlowProvider } from "./onboarding-flow.tsx";
import { GameAccountStep } from "./steps/game-account-step.tsx";
import { IntentChoiceStep } from "./steps/intention-step.tsx";
import { InvitationStep } from "./steps/invitation-step.tsx";
import { OrganizationStep } from "./steps/organization-step.tsx";
import { OnboardingReview } from "./steps/review-step.tsx";
import { ClubStep } from "./steps/club-step.tsx";
import type { OnboardingDraftStore } from "./onboarding-draft-storage.ts";
import { STORY_INVITATION_PREVIEW, storyResumeDraftStore } from "./onboarding-story-draft.ts";

const styles = stylex.create({
  stub: {
    padding: "2rem",
  },
});

type OnboardingStoryPath =
  | "/onboarding/intention"
  | "/onboarding/organization"
  | "/onboarding/invitation"
  | "/onboarding/game-account"
  | "/onboarding/club"
  | "/onboarding/review"
  | `/onboarding/invitation?invitation=${string}`;

export interface StoryOnboardingGateway extends OnboardingGateway {
  readonly initialStatus: OnboardingStatusDto;
}

export type StoryExternalClub = {
  readonly providerKey: "ea-clubs" | "manual" | "screenshot-ocr";
  readonly externalClubId: string;
  readonly name: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly imageUrl: string | null;
};

const FC26_CREST_FERA =
  "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png";

/** Sample EA clubs for Storybook and tests. Names share "Fera" so one query matches all. */
export const STORY_EXTERNAL_CLUBS = [
  {
    providerKey: "ea-clubs",
    externalClubId: "10754",
    name: "Fera Enjaulada",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: FC26_CREST_FERA,
  },
  {
    providerKey: "ea-clubs",
    externalClubId: "22110",
    name: "Fera Night Owls",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: null,
  },
  {
    providerKey: "ea-clubs",
    externalClubId: "33021",
    name: "Fera Barranco",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: null,
  },
] as const satisfies readonly StoryExternalClub[];

export function storyExternalClubs(count: 1 | 2 | 3): readonly StoryExternalClub[] {
  return STORY_EXTERNAL_CLUBS.slice(0, count);
}

export function createFakeOnboardingGateway(input?: {
  path?: OnboardingPathDto | null;
  currentStep?: OnboardingStepDto;
  failSave?: boolean;
  pendingSave?: boolean;
  failComplete?: boolean;
  /** Typed finish failure for invitation/org/player complete calls. */
  completeError?: IdentityOnboardingClientError;
  /** Typed name-availability failure with optional support code. */
  checkNameError?: IdentityOnboardingClientError;
  /** Typed save-progress failure with optional support code. */
  saveError?: IdentityOnboardingClientError;
  inspectError?: IdentityOnboardingClientError;
  inspectInvitation?: OnboardingGateway["inspectCompetitionInvitation"];
  organizationNameAvailable?: boolean;
  clubs?: readonly StoryExternalClub[];
  searchError?: boolean;
  /** Outcome the player completion reports for a requested club. */
  clubAssociation?: Extract<ExternalClubAssociationOutcomeDto, "associated" | "failed">;
  onSearchExternalClubs?: (
    request: Parameters<OnboardingGateway["searchExternalClubs"]>[0],
  ) => void;
}): StoryOnboardingGateway {
  let path = input?.path ?? null;
  let currentStep = input?.currentStep ?? "intention";
  const throwCompleteFailure = () => {
    if (input?.completeError) throw input.completeError;
    if (input?.failComplete) throw new Error("story.complete_failed");
  };
  return {
    get initialStatus() {
      return {
        completed: false,
        completedAt: null,
        version: null,
        path,
        currentStep,
      };
    },
    async checkOrganizationName() {
      if (input?.checkNameError) throw input.checkNameError;
      return { available: input?.organizationNameAvailable ?? true };
    },
    async saveProgress(next) {
      if (input?.saveError) throw input.saveError;
      if (input?.failSave) throw new Error("story.save_failed");
      if (input?.pendingSave) return await new Promise<OnboardingStatusDto>(() => undefined);
      path = next.path;
      currentStep = next.currentStep;
      return {
        completed: false,
        completedAt: null,
        version: null,
        path,
        currentStep,
      };
    },
    async createOrganization(request) {
      throwCompleteFailure();
      return {
        organizationId: "org-story",
        name: request.name,
        slug: "org-story",
        timeZone: request.timeZone,
        logo: { kind: "monogram" },
        role: "organizer",
        profile: storyProfile,
        gameAccount: null,
        destination: {
          kind: "organization",
          organizationId: "org-story",
        },
      };
    },
    async acceptInvitation() {
      throwCompleteFailure();
      return {
        organizationId: "org-invited",
        organizationName: "Liga invitante",
        role: "member",
        competitionRole: "player",
        competitionId: "competition-invited",
        competitionName: "Copa Invitación",
        profile: storyProfile,
        gameAccount: null,
        destination: {
          kind: "competition",
          organizationId: "org-invited",
          competitionId: "competition-invited",
        },
      };
    },
    async inspectCompetitionInvitation(request) {
      if (input?.inspectInvitation) return input.inspectInvitation(request);
      if (input?.inspectError) throw input.inspectError;
      return STORY_INVITATION_PREVIEW;
    },
    async completePlayer(request) {
      throwCompleteFailure();
      return {
        externalClubAssociation: request.externalClub
          ? (input?.clubAssociation ?? "associated")
          : "skipped",
      };
    },
    async searchExternalClubs(request) {
      input?.onSearchExternalClubs?.(request);
      if (input?.searchError) throw new Error("story.search_failed");
      const clubs = input?.clubs ?? [...STORY_EXTERNAL_CLUBS];
      const query = request.query.trim().toLowerCase();
      return clubs
        .map((club) => ({
          ...club,
          platform: request.platform ?? club.platform,
          gameEdition: request.gameEdition ?? club.gameEdition,
        }))
        .filter((club) => club.name.toLowerCase().includes(query));
    },
  };
}

function createOnboardingStoryRouter(
  initialPath: OnboardingStoryPath,
  gateway: StoryOnboardingGateway,
  draftStore: OnboardingDraftStore | undefined,
  locale: Locale = "es",
) {
  const rootRoute = createRootRoute({
    component: () => (
      <I18nProvider initialLocale={locale} persistLocale={persistStoryLocale}>
        <QueryTestProvider>
          <OnboardingFlowProvider
            draftStore={draftStore ?? storyResumeDraftStore(gateway.initialStatus)}
            gateway={gateway}
            initialStatus={gateway.initialStatus}
          >
            <Outlet />
          </OnboardingFlowProvider>
        </QueryTestProvider>
      </I18nProvider>
    ),
  });

  const routes = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/intention",
      component: IntentChoiceStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/organization",
      component: OrganizationStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/invitation",
      component: InvitationStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/game-account",
      component: GameAccountStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/club",
      component: ClubStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/review",
      component: OnboardingReview,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/player",
      validateSearch: playerHomeSearchSchema,
      component: StoryPlayerHome,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs",
      component: () => (
        <main {...applyProps(undefined, undefined, styles.stub)}>Organizaciones</main>
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <main {...applyProps(undefined, undefined, styles.stub)}>Organización</main>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <main {...applyProps(undefined, undefined, styles.stub)}>Competición</main>,
    }),
  ];

  return createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

function StoryPlayerHome() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  return (
    <main {...applyProps(undefined, undefined, styles.stub)}>
      <h1 {...applyProps(undefined, undefined, typography.heading)}>Espacio personal</h1>
      {search.clubAssociation === "failed" ? (
        <ClubAssociationNotice
          onDismiss={() => void navigate({ to: "/player", search: {}, replace: true })}
        />
      ) : null}
    </main>
  );
}

const storyProfile = { id: "profile-story", createdAt: "2026-07-31T12:00:00.000Z" };

export function OnboardingStoryRouter({
  gateway,
  initialPath,
  draftStore,
  locale = "es",
}: {
  gateway: StoryOnboardingGateway;
  initialPath: OnboardingStoryPath;
  /** Share one store across two renders to simulate a reload. */
  draftStore?: OnboardingDraftStore;
  locale?: Locale;
}) {
  const router = useMemo(
    () => createOnboardingStoryRouter(initialPath, gateway, draftStore, locale),
    [draftStore, gateway, initialPath, locale],
  );
  return <RouterProvider router={router} />;
}

async function persistStoryLocale(): Promise<void> {}
