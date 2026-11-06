"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import type {
  ExternalClubDto,
  ListMyMembershipsResponse,
  OnboardingPathDto,
  OnboardingStatusDto,
  OnboardingStepDto,
  SearchClubsQueryInput,
} from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import {
  useSaveOnboardingProgressMutation,
  useSeededOnboardingStatus,
} from "@/modules/identity/presentation/identity-queries.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { PendingScreen } from "@/shared/presentation/status-screen.tsx";
import {
  buildOnboardingFlowErrorDisplay,
  buildSupportFields,
} from "@/shared/presentation/support-fields.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { finalizationError } from "./onboarding-finalization-errors.ts";
import { useExternalSync } from "@futrob/ui";
import { isOnboardingPathname, routeForOnboardingStep } from "./onboarding-routing.ts";
import {
  memoryOnboardingDraftStore,
  type OnboardingDraftStore,
} from "./onboarding-draft-storage.ts";
import { initialOnboardingState } from "./onboarding-resume.ts";
import { onboardingInvitationSearchSchema } from "./onboarding-invitation-handoff.ts";
import { browserOnboardingGateway, type OnboardingGateway } from "./onboarding-flow-gateway.ts";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";
import { finishOnboardingPath, type OnboardingFinishResult } from "./onboarding-finish.ts";
import {
  listOrganizationCompetitions,
  listOrganizationTeams,
} from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { workspaceAccessQueryOptions } from "@/shared/presentation/shell/workspace-access.ts";
import { getEffectiveAccess } from "@/context/permissions.ts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";

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
  draftStore: providedDraftStore,
}: Readonly<{
  children: ReactNode;
  initialStatus: OnboardingStatusDto;
  gateway?: OnboardingGateway;
  /** Production passes the signed-in user's browser store; stories and tests keep memory. */
  draftStore?: OnboardingDraftStore;
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
  const [draftStore] = useState(() => providedDraftStore ?? memoryOnboardingDraftStore());
  const linkedInvitation = useRouterState({
    select: (state) => onboardingInvitationSearchSchema.safeParse(state.location.search).data,
  })?.invitation;
  const [initial] = useState(() => {
    const stored = draftStore.load();
    if (linkedInvitation) {
      const draft = stored?.path === "invitation" ? stored.draft : createEmptyDraft();
      return {
        path: "invitation" as const,
        step: "invitation" as const,
        draft: { ...draft, invitationToken: linkedInvitation },
      };
    }
    return initialOnboardingState(initialStatus, stored);
  });
  const [path, setPathState] = useState<OnboardingPathDto | null>(initial.path);
  const [currentStep, setCurrentStep] = useState<OnboardingStepDto>(initial.step);
  const [draft, setDraft] = useState<OnboardingDraft>(initial.draft);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const completed = useSeededOnboardingStatus(initialStatus).data?.completed === true;
  // A provider can remount for a moment while a finished actor leaves onboarding; it must not
  // write the draft that finishing just cleared.
  useExternalSync(() => {
    if (!leaving && !completed) draftStore.save({ path, step: currentStep, draft });
  }, [completed, currentStep, draftStore, leaving, path, draft]);

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
        setError(null);
        setPathState(requestedPath);
        setCurrentStep(step);
        // The stored step only picks where a returning actor resumes and feeds the funnel;
        // the local draft covers a failed write, so it never blocks or rolls back the user.
        // Writes queue so the server ends on the last step even when the user moves fast.
        saveQueueRef.current = saveQueueRef.current
          .then(() => saveProgressMutation.mutateAsync({ path: requestedPath, currentStep: step }))
          .catch(() => undefined);
        await navigate({ to: routeForOnboardingStep(step) });
      },
      async finish() {
        if (!path || saving || finishingRef.current || retry.blocked) return;
        finishingRef.current = true;
        setSaving(true);
        setLeaving(true);
        setError(null);
        let result: OnboardingFinishResult;
        try {
          result = await finishOnboardingPath[path](gateway, draft);
        } catch (caught) {
          finishingRef.current = false;
          const clientError = caught instanceof IdentityOnboardingClientError ? caught : null;
          const nextError = finalizationError(path, clientError);
          retry.start(nextError.retryAfterSeconds);
          setError(nextError);
          setLeaving(false);
          setSaving(false);
          return;
        }

        draftStore.clear();
        markOnboardingCompletedInCache(queryClient, path);
        if (result.path === "organization") {
          const { organizationId, name, slug, timeZone, logo, role } = result.created;
          queryClient.setQueryData(queryKeys.organizations.profile(organizationId), {
            organizationId,
            name,
            slug,
            timeZone,
            logo,
          });
          queryClient.setQueryData<ListMyMembershipsResponse>(
            queryKeys.organizations.mine(),
            (previous) => ({
              memberships: [
                ...(previous?.memberships ?? []).filter(
                  (item) => item.organizationId !== organizationId,
                ),
                {
                  organizationId,
                  organizationName: name,
                  organizationSlug: slug,
                  organizationLogo: logo,
                  role,
                },
              ],
            }),
          );
        }
        for (const queryKey of [
          queryKeys.organizations.mine(),
          queryKeys.players.me(),
          queryKeys.competitions.all,
          queryKeys.authorization.all,
        ]) {
          void queryClient.invalidateQueries({ queryKey });
        }
        if (result.path === "organization") {
          await prepareOrganizationDashboard(queryClient, result.created.organizationId);
        }
        try {
          await navigate({ ...result.destination, replace: true, viewTransition: true });
        } catch {
          // Completion already succeeded. The onboarding loader resolves its destination
          // after a full reload, without offering to create the same organization again.
          window.location.reload();
        }
      },
    }),
    [
      currentStep,
      draft,
      draftStore,
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
          <PendingScreen message={t("onboarding.loading.preparing")} />
        </>
      ) : (
        children
      )}
    </OnboardingFlowContext>
  );
}

async function prepareOrganizationDashboard(queryClient: QueryClient, organizationId: string) {
  const scope = { organizationId };
  const permissions = [COMPETITION_PERMISSION.update];
  const ready = Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.competitions.byOrganization(organizationId),
      queryFn: () => listOrganizationCompetitions(organizationId),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.competitions.teams(organizationId),
      queryFn: () => listOrganizationTeams(organizationId),
    }),
    queryClient.prefetchQuery(workspaceAccessQueryOptions(scope)),
    queryClient.prefetchQuery({
      queryKey: queryKeys.authorization.effectiveAccess(scope, permissions),
      queryFn: () => getEffectiveAccess(scope, permissions),
    }),
  ]);
  // Keep the review stable through ordinary reads, but let the dashboard handle
  // slow/offline queries after three seconds. Prefetch failures never reject completion.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      ready,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 3000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
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
