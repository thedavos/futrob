import { z } from "zod";
import {
  competitionPlatformSchema,
  onboardingPathSchema,
  onboardingStepSchema,
  playerExternalClubSelectionInputSchema,
  type OnboardingPathDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";

/** What this browser last saw of an unfinished onboarding. */
export interface StoredOnboarding {
  readonly path: OnboardingPathDto | null;
  readonly step: OnboardingStepDto;
  readonly draft: OnboardingDraft;
}

/** Keeps an unfinished onboarding across reloads. Never stores the invitation code. */
export interface OnboardingDraftStore {
  load(): StoredOnboarding | null;
  save(stored: StoredOnboarding): void;
  clear(): void;
}

const storedDraftSchema = z.object({
  version: z.literal(3),
  path: onboardingPathSchema.nullable(),
  step: onboardingStepSchema,
  draft: z.object({
    organizationName: z.string(),
    organizationTimeZone: z.string(),
    organizationAccountStep: z.boolean(),
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

function toStored({ path, step, draft }: StoredOnboarding): StoredDraft {
  const { invitationToken: _token, invitationPreview: _preview, ...kept } = draft;
  return { version: 3, path, step, draft: kept };
}

function fromStored(raw: string | null): StoredOnboarding | null {
  if (!raw) return null;
  try {
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { path, step, draft } = parsed.data;
    return { path, step, draft: { ...createEmptyDraft(), ...draft } };
  } catch {
    return null;
  }
}

/** One draft per signed-in user, so another account on the same browser never reads it. */
export function browserOnboardingDraftStore(userId: string): OnboardingDraftStore {
  const key = `futrob:onboarding-draft:${userId}`;
  return {
    load: () => fromStored(readStorage(key)),
    save: (stored) => writeStorage(key, JSON.stringify(toStored(stored))),
    clear: () => writeStorage(key, null),
  };
}

export function memoryOnboardingDraftStore(): OnboardingDraftStore {
  let raw: string | null = null;
  return {
    load: () => fromStored(raw),
    save: (stored) => {
      raw = JSON.stringify(toStored(stored));
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
