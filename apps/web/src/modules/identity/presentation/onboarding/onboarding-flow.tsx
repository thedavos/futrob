"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import type {
  ExternalClubDto,
  OnboardingPathDto,
  OnboardingStatusDto,
  OnboardingStepDto,
  SearchClubsQueryInput,
} from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import { useSaveOnboardingProgressMutation } from "@/modules/identity/presentation/identity-queries.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { RoutePendingState } from "@/shared/presentation/route-load-state.tsx";
import {
  buildOnboardingFlowErrorDisplay,
  buildSupportFields,
} from "@/shared/presentation/support-fields.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { finalizationError } from "./onboarding-finalization-errors.ts";
import {
  isOnboardingPathname,
  resolveOnboardingStep,
  resolvePersistedOnboardingStep,
  routeForOnboardingStep,
} from "./onboarding-routing.ts";
import { browserOnboardingGateway, type OnboardingGateway } from "./onboarding-flow-gateway.ts";
import {
  competitionFromDraft,
  createEmptyDraft,
  externalClubLocatorFromDraft,
  playerAccountFromDraft,
  type OnboardingDraft,
} from "./onboarding-draft.ts";

interface OnboardingFlowValue {
  readonly saving: boolean;
  readonly error: SupportError | null;
  readonly retryBlocked: boolean;
  readonly retryAfterSeconds: number;
  readonly path: OnboardingPathDto | null;
  readonly currentStep: OnboardingStepDto;
  readonly draft: OnboardingDraft;
  setPath(path: OnboardingPathDto): void;
  updateDraft(patch: Partial<OnboardingDraft>): void;
  inspectCompetitionInvitation(token: string): Promise<boolean>;
  clearGameAccount(): void;
  clearExternalClub(): void;
  checkOrganizationName(name: string): Promise<boolean | null>;
  searchExternalClubs(input: SearchClubsQueryInput): Promise<readonly ExternalClubDto[]>;
  goTo(step: OnboardingStepDto, path?: OnboardingPathDto | null): Promise<void>;
  finish(): Promise<void>;
}

const OnboardingFlowContext = createContext<OnboardingFlowValue | null>(null);

export function OnboardingFlowProvider({
  children,
  initialStatus,
  gateway = browserOnboardingGateway,
  bootstrap = "cold",
}: Readonly<{
  children: ReactNode;
  initialStatus: OnboardingStatusDto;
  gateway?: OnboardingGateway;
  /** Production cold-loads at intention; Storybook/harness may honor persisted step. */
  bootstrap?: "cold" | "persisted";
}>) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const saveProgressMutation = useSaveOnboardingProgressMutation((input) =>
    gateway.saveProgress(input),
  );
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finishingRef = useRef(false);
  const invitationInspectionSequenceRef = useRef(0);
  const invitationInspectingRef = useRef(false);
  const [error, setError] = useState<
    (Omit<SupportError, "message"> & { readonly messageKey: ParameterlessMessageKey }) | null
  >(null);
  const retry = useRetryAfterCountdown();
  const [path, setPathState] = useState<OnboardingPathDto | null>(() => initialStatus.path);
  const [currentStep, setCurrentStep] = useState<OnboardingStepDto>(() =>
    bootstrap === "persisted"
      ? resolvePersistedOnboardingStep(initialStatus.path, initialStatus.currentStep)
      : resolveOnboardingStep(initialStatus.path, initialStatus.currentStep),
  );
  const [draft, setDraft] = useState<OnboardingDraft>(createEmptyDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    queryClient.setQueryData(queryKeys.identity.onboardingStatus(), initialStatus);
  }, [initialStatus, queryClient]);

  const value = useMemo<OnboardingFlowValue>(
    () => ({
      saving,
      error: error
        ? buildOnboardingFlowErrorDisplay({
            message: t(error.messageKey),
            requestId: error.requestId,
            retryAfterSeconds: error.retryAfterSeconds
              ? retry.remainingSeconds || undefined
              : undefined,
          })
        : null,
      retryBlocked: retry.blocked,
      retryAfterSeconds: retry.remainingSeconds,
      path,
      currentStep,
      draft,
      setPath(nextPath) {
        if (nextPath !== path) setDraft(createEmptyDraft());
        setPathState(nextPath);
        setError(null);
      },
      updateDraft(patch) {
        if (Object.hasOwn(patch, "invitationToken")) {
          invitationInspectionSequenceRef.current += 1;
          setDraft((current) => ({ ...current, ...patch, invitationPreview: null }));
        } else {
          setDraft((current) => ({ ...current, ...patch }));
        }
        setError(null);
      },
      async inspectCompetitionInvitation(token) {
        if (invitationInspectingRef.current || saving) return false;
        const normalizedToken = token.trim();
        const sequence = invitationInspectionSequenceRef.current + 1;
        invitationInspectionSequenceRef.current = sequence;
        invitationInspectingRef.current = true;
        setSaving(true);
        try {
          const preview = await gateway.inspectCompetitionInvitation({ token: normalizedToken });
          if (
            sequence !== invitationInspectionSequenceRef.current ||
            draftRef.current.invitationToken.trim() !== normalizedToken
          ) {
            return false;
          }
          setDraft((current) => ({ ...current, invitationPreview: preview }));
          return true;
        } catch (error) {
          if (
            sequence !== invitationInspectionSequenceRef.current ||
            draftRef.current.invitationToken.trim() !== normalizedToken
          ) {
            return false;
          }
          throw error;
        } finally {
          invitationInspectingRef.current = false;
          setSaving(false);
        }
      },
      clearGameAccount() {
        setDraft((current) => ({
          ...current,
          gameAccountIdentifier: "",
          platform: null,
          gameEdition: "",
          customGameEdition: false,
        }));
      },
      clearExternalClub() {
        setDraft((current) => ({ ...current, selectedExternalClub: null }));
      },
      async checkOrganizationName(name) {
        if (saving) return null;
        setSaving(true);
        setError(null);
        try {
          const result = await gateway.checkOrganizationName({ name });
          return result.available;
        } catch (caught) {
          const clientError = caught instanceof IdentityOnboardingClientError ? caught : null;
          setError({
            messageKey: "errors.onboarding.organizationCheck",
            ...buildSupportFields({
              requestId: clientError?.requestId,
              retryAfterSeconds: clientError?.retryAfterSeconds,
            }),
          });
          return null;
        } finally {
          setSaving(false);
        }
      },
      async searchExternalClubs(input) {
        return gateway.searchExternalClubs(input);
      },
      async goTo(step, requestedPath = path) {
        if (leaving || saving || finishingRef.current) return;
        const previousPath = path;
        const previousStep = currentStep;
        setError(null);
        setPathState(requestedPath);
        setCurrentStep(step);
        await navigate({ to: routeForOnboardingStep(step) });
        try {
          await saveProgressMutation.mutateAsync({ path: requestedPath, currentStep: step });
        } catch (caught) {
          const clientError = caught instanceof IdentityOnboardingClientError ? caught : null;
          setError({
            messageKey: "errors.onboarding.saveProgress",
            ...buildSupportFields({
              requestId: clientError?.requestId,
              retryAfterSeconds: clientError?.retryAfterSeconds,
            }),
          });
          setPathState(previousPath);
          setCurrentStep(previousStep);
          await navigate({ to: routeForOnboardingStep(previousStep) });
        }
      },
      async finish() {
        if (!path || saving || finishingRef.current || retry.blocked) return;
        finishingRef.current = true;
        setSaving(true);
        setLeaving(true);
        setError(null);
        try {
          if (path === "organization") {
            const competition = competitionFromDraft(draft);
            if (!competition) throw new Error("Incomplete competition draft");
            const created = await gateway.createOrganization({
              name: draft.organizationName.trim(),
              competition,
              gameAccount: playerAccountFromDraft(draft),
            });
            markOnboardingCompletedInCache(queryClient, path);
            await navigate({
              to: "/orgs/$orgId/competitions/$competitionId/setup",
              params: {
                orgId: created.destination.organizationId,
                competitionId: created.destination.competitionId,
              },
              replace: true,
            });
          } else if (path === "invitation") {
            const accepted = await gateway.acceptInvitation({
              token: draft.invitationToken.trim(),
              gameAccount: playerAccountFromDraft(draft),
            });
            markOnboardingCompletedInCache(queryClient, path);
            await navigate({
              to: "/orgs/$orgId/competitions/$competitionId",
              params: {
                orgId: accepted.destination.organizationId,
                competitionId: accepted.destination.competitionId,
              },
              replace: true,
            });
          } else {
            await gateway.completePlayer({
              gameAccount: playerAccountFromDraft(draft),
              externalClub: externalClubLocatorFromDraft(draft),
            });
            markOnboardingCompletedInCache(queryClient, path);
            await navigate({ to: "/player", replace: true });
          }
        } catch (caught) {
          finishingRef.current = false;
          const clientError = caught instanceof IdentityOnboardingClientError ? caught : null;
          const nextError = finalizationError(path, clientError);
          retry.start(nextError.retryAfterSeconds);
          setError(nextError);
          setLeaving(false);
          setSaving(false);
        }
      },
    }),
    [
      currentStep,
      draft,
      error,
      gateway,
      leaving,
      navigate,
      path,
      queryClient,
      retry.blocked,
      retry.remainingSeconds,
      retry.start,
      saveProgressMutation,
      saving,
      t,
    ],
  );

  const expectedRoute = routeForOnboardingStep(currentStep);
  // Only correct the URL while we are still inside onboarding. During exit
  // transitions the provider can briefly see pathname=/player with a remounted
  // cold state (intention); navigating then loops the user back to the start.
  const shouldSyncRoute = !leaving && isOnboardingPathname(pathname) && pathname !== expectedRoute;
  return (
    <OnboardingFlowContext value={value}>
      {shouldSyncRoute ? (
        <>
          <Navigate to={expectedRoute} replace />
          <RoutePendingState message={t("onboarding.loading.progress")} />
        </>
      ) : (
        children
      )}
    </OnboardingFlowContext>
  );
}

function markOnboardingCompletedInCache(queryClient: QueryClient, path: OnboardingPathDto): void {
  const previous = queryClient.getQueryData<OnboardingStatusDto>(
    queryKeys.identity.onboardingStatus(),
  );
  queryClient.setQueryData(queryKeys.identity.onboardingStatus(), {
    completed: true,
    completedAt: previous?.completedAt ?? new Date().toISOString(),
    version: previous?.version ?? 1,
    path,
    currentStep: null,
  } satisfies OnboardingStatusDto);
}

export function useOnboardingFlow(): OnboardingFlowValue {
  const value = useContext(OnboardingFlowContext);
  if (!value) throw new Error("useOnboardingFlow must be used within OnboardingFlowProvider");
  return value;
}
