import {
  ONBOARDING_STEPS_BY_PATH,
  type OnboardingStatusDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import {
  memoryOnboardingDraftStore,
  type OnboardingDraftStore,
  type StoredOnboarding,
} from "./onboarding-draft-storage.ts";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";

export const STORY_INVITATION_PREVIEW = {
  organizationId: "org-invited",
  organizationName: "Liga invitante",
  competitionId: "competition-invited",
  competitionName: "Copa Invitación",
  competitionRole: "player",
  expiresAt: "2026-09-01T12:00:00.000Z",
} as const;

/** What an actor has filled in by the time they leave each step. */
const storyDataByStep = {
  intention: {},
  organization: { organizationName: "Liga Norte" },
  competition: {
    competitionName: "Liga Futrob Apertura",
    competitionPlatform: "playstation",
    competitionRegion: "south-america",
    competitionTimeZone: "America/Lima",
    competitionFormat: "league",
    competitionGameEdition: "FC 26",
  },
  invitation: { invitationToken: "invite-token", invitationPreview: STORY_INVITATION_PREVIEW },
  "game-account": {},
  club: {},
  review: {},
} satisfies Record<OnboardingStepDto, Partial<OnboardingDraft>>;

/**
 * A story that opens on a later step stands for an actor who already filled the earlier
 * ones, so the provider resumes there instead of sending it back to the first missing step.
 */
export function storyResumeDraftStore(status: OnboardingStatusDto): OnboardingDraftStore {
  const store = memoryOnboardingDraftStore();
  let seed: StoredOnboarding | null =
    status.path !== null && status.currentStep !== null
      ? { path: status.path, step: status.currentStep, draft: seededStoryDraft(status) }
      : null;
  return {
    load() {
      const stored = seed ?? store.load();
      seed = null;
      return stored;
    },
    save: (stored) => store.save(stored),
    clear: () => store.clear(),
  };
}

function seededStoryDraft({ path, currentStep }: OnboardingStatusDto): OnboardingDraft {
  let draft = createEmptyDraft();
  if (!path || !currentStep) return draft;
  const steps: readonly OnboardingStepDto[] = ONBOARDING_STEPS_BY_PATH[path];
  for (const step of steps.slice(0, Math.max(0, steps.indexOf(currentStep)))) {
    draft = { ...draft, ...storyDataByStep[step] };
  }
  return draft;
}
