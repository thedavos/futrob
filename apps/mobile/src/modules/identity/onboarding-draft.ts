import * as SecureStore from "expo-secure-store";
import { z } from "zod";
import {
  externalClubSchema,
  onboardingPathSchema,
  playerGameAccountInputSchema,
  type ExternalClubDto,
  type OnboardingPathDto,
  type PlayerGameAccountInputDto,
} from "@futrob/api-contracts";

const DRAFT_KEY = "futrob.onboarding.draft.v1";
const INVITATION_KEY = "futrob.onboarding.pending-invitation";
const draftSchema = z.object({
  version: z.literal(2),
  userId: z.string().min(1),
  path: onboardingPathSchema.nullable(),
  organizationName: z.string(),
  organizationTimeZone: z.string(),
  organizationAccountStep: z.boolean(),
  invitationToken: z.string(),
  gameAccount: playerGameAccountInputSchema.partial(),
  club: externalClubSchema.nullable(),
});

export type OnboardingDraft = {
  path: OnboardingPathDto | null;
  organizationName: string;
  organizationTimeZone: string;
  organizationAccountStep: boolean;
  invitationToken: string;
  gameAccount: Partial<PlayerGameAccountInputDto>;
  club: ExternalClubDto | null;
};

export function emptyOnboardingDraft(): OnboardingDraft {
  let timeZone = "UTC";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // Hermes may not ship complete Intl data on every native build.
  }
  return {
    path: null,
    organizationName: "",
    organizationTimeZone: timeZone,
    organizationAccountStep: false,
    invitationToken: "",
    gameAccount: {},
    club: null,
  };
}

export async function loadOnboardingDraft(userId: string): Promise<OnboardingDraft> {
  const raw = await SecureStore.getItemAsync(DRAFT_KEY);
  if (!raw) return emptyOnboardingDraft();
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.userId !== userId) return emptyOnboardingDraft();
    const {
      path,
      organizationName,
      organizationTimeZone,
      organizationAccountStep,
      invitationToken,
      gameAccount,
      club,
    } = parsed.data;
    return {
      path,
      organizationName,
      organizationTimeZone,
      organizationAccountStep,
      invitationToken,
      gameAccount,
      club,
    };
  } catch {
    return emptyOnboardingDraft();
  }
}

export async function saveOnboardingDraft(userId: string, draft: OnboardingDraft): Promise<void> {
  await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify({ version: 2, userId, ...draft }));
}

export async function clearOnboardingDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(DRAFT_KEY);
}

export async function savePendingInvitation(token: string): Promise<void> {
  await SecureStore.setItemAsync(INVITATION_KEY, token.trim());
}

export async function takePendingInvitation(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(INVITATION_KEY);
  if (token) await SecureStore.deleteItemAsync(INVITATION_KEY);
  return token;
}

export async function peekPendingInvitation(): Promise<string | null> {
  return SecureStore.getItemAsync(INVITATION_KEY);
}

export async function clearPendingInvitation(): Promise<void> {
  await SecureStore.deleteItemAsync(INVITATION_KEY);
}
