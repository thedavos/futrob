import { z } from "zod";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
  onboardingPathSchema,
  playerExternalClubSelectionInputSchema,
  type OnboardingPathDto,
} from "@futrob/api-contracts";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";

/** Keeps an unfinished onboarding draft across reloads. Never stores the invitation code. */
export interface OnboardingDraftStore {
  load(path: OnboardingPathDto | null): OnboardingDraft;
  save(path: OnboardingPathDto | null, draft: OnboardingDraft): void;
  clear(): void;
}

const storedDraftSchema = z.object({
  version: z.literal(1),
  path: onboardingPathSchema.nullable(),
  draft: z.object({
    organizationName: z.string(),
    competitionName: z.string(),
    competitionPlatform: competitionPlatformSchema.nullable(),
    competitionRegion: competitionRegionSchema.nullable(),
    competitionTimeZone: z.string(),
    competitionFormat: competitionFormatSchema.nullable(),
    competitionGameEdition: z.string(),
    customCompetitionGameEdition: z.boolean(),
    gameAccountIdentifier: z.string(),
    platform: competitionPlatformSchema.nullable(),
    gameEdition: z.string(),
    customGameEdition: z.boolean(),
    selectedExternalClub: playerExternalClubSelectionInputSchema
      .extend({ name: z.string(), imageUrl: z.string().nullable() })
      .nullable(),
  }),
});

type StoredDraft = z.infer<typeof storedDraftSchema>;

function toStored(path: OnboardingPathDto | null, draft: OnboardingDraft): StoredDraft {
  const { invitationToken: _token, invitationPreview: _preview, ...kept } = draft;
  return { version: 1, path, draft: kept };
}

function fromStored(raw: string | null, path: OnboardingPathDto | null): OnboardingDraft {
  if (!raw || path === null) return createEmptyDraft();
  try {
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.path !== path) return createEmptyDraft();
    return { ...createEmptyDraft(), ...parsed.data.draft };
  } catch {
    return createEmptyDraft();
  }
}

/** One draft per signed-in user, so another account on the same browser never reads it. */
export function browserOnboardingDraftStore(userId: string): OnboardingDraftStore {
  const key = `futrob:onboarding-draft:${userId}`;
  return {
    load: (path) => fromStored(readStorage(key), path),
    save: (path, draft) => writeStorage(key, JSON.stringify(toStored(path, draft))),
    clear: () => writeStorage(key, null),
  };
}

export function memoryOnboardingDraftStore(): OnboardingDraftStore {
  let raw: string | null = null;
  return {
    load: (path) => fromStored(raw, path),
    save: (path, draft) => {
      raw = JSON.stringify(toStored(path, draft));
    },
    clear: () => {
      raw = null;
    },
  };
}

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private mode or a full quota: the flow still works, it just cannot resume.
  }
}
