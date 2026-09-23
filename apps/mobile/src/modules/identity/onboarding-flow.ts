import {
  competitionDraftInputSchema,
  playerGameAccountInputSchema,
  type CompetitionDraftInputDto,
  type ExternalClubDto,
  type InspectCompetitionInvitationResponse,
  type OnboardingPathDto,
  type OnboardingStatusDto,
  type OnboardingStepDto,
  type PlayerGameAccountInputDto,
} from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import {
  clearOnboardingDraft,
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "./onboarding-draft.ts";

export type OnboardingGateway = Pick<FutrobClient, "identity" | "organizations" | "gameData">;

export const STEPS_BY_PATH = {
  player: ["intention", "game-account", "club", "review"],
  organization: ["intention", "organization", "competition", "game-account", "review"],
  invitation: ["intention", "invitation", "game-account", "review"],
} as const;

export function stepsForPath(path: OnboardingPathDto): readonly OnboardingStepDto[] {
  return STEPS_BY_PATH[path];
}

export type FinishResult = { readonly route: string };

export function accountFromDraft(draft: OnboardingDraft): PlayerGameAccountInputDto | null {
  const values = draft.gameAccount;
  if (!values.identifier?.trim() && !values.platform && !values.gameEdition?.trim()) return null;
  const parsed = playerGameAccountInputSchema.safeParse(values);
  return parsed.success ? parsed.data : null;
}

export function accountIsValid(draft: OnboardingDraft): boolean {
  const values = draft.gameAccount;
  return (
    (!values.identifier?.trim() && !values.platform && !values.gameEdition?.trim()) ||
    playerGameAccountInputSchema.safeParse(values).success
  );
}

export function competitionFromDraft(draft: OnboardingDraft): CompetitionDraftInputDto | null {
  const parsed = competitionDraftInputSchema.safeParse(draft.competition);
  return parsed.success ? parsed.data : null;
}

export function missingRequiredStep(draft: OnboardingDraft): OnboardingStepDto | null {
  if (!draft.path) return "intention";
  if (draft.path === "organization" && !draft.organizationName.trim()) return "organization";
  if (draft.path === "organization" && !competitionFromDraft(draft)) return "competition";
  if (draft.path === "invitation" && !draft.invitationToken.trim()) return "invitation";
  if (!accountIsValid(draft)) return "game-account";
  return null;
}

function normalizedStep(
  path: OnboardingPathDto | null,
  step: OnboardingStepDto | null,
): OnboardingStepDto {
  if (!path || !step) return "intention";
  if (step === "game")
    return path === "player"
      ? "game-account"
      : path === "organization"
        ? "organization"
        : "intention";
  return stepsForPath(path).includes(step) ? step : "intention";
}

export class NativeOnboardingFlow {
  private writeQueue: Promise<void> = Promise.resolve();
  private active = false;
  private inspectionSequence = 0;
  readonly userId: string;
  readonly gateway: OnboardingGateway;
  draft: OnboardingDraft;
  step: OnboardingStepDto;
  preview: InspectCompetitionInvitationResponse | null = null;

  private constructor(
    userId: string,
    gateway: OnboardingGateway,
    draft: OnboardingDraft,
    step: OnboardingStepDto,
  ) {
    this.userId = userId;
    this.gateway = gateway;
    this.draft = draft;
    this.step = step;
  }

  static async load(
    userId: string,
    status: OnboardingStatusDto,
    gateway: OnboardingGateway,
  ): Promise<NativeOnboardingFlow> {
    const stored = await loadOnboardingDraft(userId);
    const draft =
      status.path === stored.path ? stored : { ...emptyOnboardingDraft(), path: status.path };
    return new NativeOnboardingFlow(
      userId,
      gateway,
      draft,
      normalizedStep(status.path, status.currentStep),
    );
  }

  update(patch: Partial<OnboardingDraft>): Promise<void> {
    const pathChanged = patch.path !== undefined && patch.path !== this.draft.path;
    const base = pathChanged ? emptyOnboardingDraft() : this.draft;
    this.draft = {
      ...base,
      ...patch,
      competition: patch.competition
        ? { ...base.competition, ...patch.competition }
        : base.competition,
      gameAccount: patch.gameAccount
        ? Object.keys(patch.gameAccount).length === 0
          ? {}
          : { ...base.gameAccount, ...patch.gameAccount }
        : base.gameAccount,
    };
    if (patch.invitationToken !== undefined) {
      this.preview = null;
      this.inspectionSequence++;
    }
    const snapshot = this.draft;
    this.writeQueue = this.writeQueue
      .catch(() => {})
      .then(() => saveOnboardingDraft(this.userId, snapshot));
    return this.writeQueue;
  }

  async goTo(step: OnboardingStepDto): Promise<void> {
    if (this.active) throw new Error("Espera a que termine la operación actual.");
    const path = this.draft.path;
    if (path === null && step !== "intention") throw new Error("Elige cómo continuar.");
    if (path !== null && !stepsForPath(path).includes(step)) {
      throw new Error("Este paso no corresponde al camino elegido.");
    }
    this.active = true;
    try {
      await this.writeQueue;
      await this.gateway.identity.saveOnboardingProgress({ path, currentStep: step });
      this.step = step;
    } finally {
      this.active = false;
    }
  }

  async inspectInvitation(): Promise<InspectCompetitionInvitationResponse> {
    const token = this.draft.invitationToken.trim();
    if (!token) throw new Error("Ingresa la invitación.");
    const sequence = ++this.inspectionSequence;
    const preview = await this.gateway.identity.inspectCompetitionInvitation({ token });
    if (sequence !== this.inspectionSequence || token !== this.draft.invitationToken.trim()) {
      throw new Error("La invitación cambió. Revísala otra vez.");
    }
    this.preview = preview;
    return preview;
  }

  async reinspectRestoredInvitation(): Promise<void> {
    if (this.draft.path === "invitation" && this.draft.invitationToken.trim()) {
      await this.inspectInvitation();
    }
  }

  async searchClubs(query: string): Promise<readonly ExternalClubDto[]> {
    if (!query.trim()) return [];
    const result = await this.gateway.gameData.clubs.search({
      query: query.trim(),
      platform: this.draft.gameAccount.platform ?? "cross-gen",
      gameEdition:
        this.draft.gameAccount.gameEdition
          ?.trim()
          .toLowerCase()
          .replace(/[\s_-]+/g, "") || "fc26",
    });
    return result.clubs;
  }

  async finish(): Promise<FinishResult> {
    if (this.active) throw new Error("La confirmación ya está en curso.");
    const missing = missingRequiredStep(this.draft);
    if (missing) throw new Error(`Completa el paso ${missing} antes de confirmar.`);
    if (this.draft.path === "invitation" && !this.preview) {
      throw new Error("Comprueba la invitación antes de confirmar.");
    }
    this.active = true;
    try {
      await this.writeQueue;
      const account = accountFromDraft(this.draft);
      if (this.draft.path === "organization") {
        const competition = competitionFromDraft(this.draft)!;
        const result = await this.gateway.identity.completeOrganizationOnboarding({
          name: this.draft.organizationName.trim(),
          competition,
          gameAccount: account,
        });
        await clearOnboardingDraft();
        return {
          route: `/orgs/${encodeURIComponent(result.destination.organizationId)}/competitions/${encodeURIComponent(result.destination.competitionId)}/setup`,
        };
      }
      if (this.draft.path === "invitation") {
        const result = await this.gateway.identity.completeInvitationOnboarding({
          token: this.draft.invitationToken.trim(),
          gameAccount: account,
        });
        await clearOnboardingDraft();
        return {
          route: `/orgs/${encodeURIComponent(result.destination.organizationId)}/competitions/${encodeURIComponent(result.destination.competitionId)}`,
        };
      }
      await this.gateway.identity.completePlayerOnboarding({
        gameAccount: account,
        externalClub: this.draft.club
          ? {
              providerKey: this.draft.club.providerKey,
              externalClubId: this.draft.club.externalClubId,
              platform: this.draft.club.platform,
              gameEdition: this.draft.club.gameEdition,
            }
          : null,
      });
      await clearOnboardingDraft();
      return { route: "/player" };
    } finally {
      this.active = false;
    }
  }
}
