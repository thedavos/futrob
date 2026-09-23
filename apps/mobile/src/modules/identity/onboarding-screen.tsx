import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { ExternalClubDto, OnboardingStepDto } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { theme } from "@/theme/theme";
import { Button, EmptyState, Logo, Screen, Text } from "@/ui";
import { GateBoundary } from "./gate-boundary.tsx";
import { getSession } from "./session-store.ts";
import { clearPendingInvitation, peekPendingInvitation } from "./onboarding-draft.ts";
import {
  NativeOnboardingFlow,
  stepsForPath,
  accountIsValid,
  competitionFromDraft,
  missingRequiredStep,
} from "./onboarding-flow.ts";
import { useMobileCopy, type MobileCopyKey, type MobileLanguage } from "./mobile-copy.ts";
import { OnboardingFields } from "./onboarding-fields.tsx";
import { nativeRoute } from "./native-route.ts";
import type { GateResult } from "./session-gate.ts";

function apiMessage(
  error: Error,
  language: MobileLanguage,
  t: (key: MobileCopyKey) => string,
): string {
  if (error instanceof FutrobApiError) {
    if (error.status === 401) return t("noSession");
    if (error.code === "api.rate_limited")
      return `${t("rateLimit")}${error.retryAfterSeconds ? ` ${error.retryAfterSeconds}s` : ""}`;
    if (error.code === "organizations.name_conflict") return t("organizationTaken");
    if (error.code.startsWith("organizations.invitation_")) return t("invalidInvitation");
    if (error.requestId) return `${t("genericError")} (${error.requestId})`;
  }
  if (error instanceof TypeError) return t("networkError");
  if (!(error instanceof FutrobApiError)) {
    if (language === "en") {
      if (error.message.startsWith("Completa el paso "))
        return "Complete the missing step before confirming.";
      if (error.message === "Comprueba la invitación antes de confirmar.")
        return "Check the invitation before confirming.";
      if (error.message === "Elige cómo continuar.") return "Choose how to continue.";
      if (error.message === "La invitación cambió. Revísala otra vez.")
        return "The invitation changed. Check it again.";
      if (error.message === "Ingresa la invitación.") return "Enter an invitation code.";
      if (error.message === "Espera a que termine la operación actual.")
        return "Wait for the current action to finish.";
      if (error.message === "Este paso no corresponde al camino elegido.")
        return "This step is not part of your selected path.";
      if (error.message === "La confirmación ya está en curso.")
        return "Confirmation is already in progress.";
    }
    return error.message;
  }
  return language === "es" ? "Ocurrió un error." : "Something went wrong.";
}

export function OnboardingScreen({ step }: { step: OnboardingStepDto }) {
  const router = useRouter();
  const { language, t, toggleLanguage } = useMobileCopy();
  const [flow, setFlow] = useState<NativeOnboardingFlow | null>(null);
  const [, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubQuery, setClubQuery] = useState("");
  const [clubs, setClubs] = useState<readonly ExternalClubDto[]>([]);
  const refresh = () => setRevision((value) => value + 1);

  const onReady = useCallback(
    (result: GateResult) => {
      if (result.kind !== "onboarding") return;
      let cancelled = false;
      void (async () => {
        const session = await getSession();
        if (!session) return;
        const next = await NativeOnboardingFlow.load(
          session.user.id,
          result.status,
          getFutrobClient(),
        );
        const pending = await peekPendingInvitation();
        if (pending) {
          await next.update({ path: "invitation", invitationToken: pending });
          await next.goTo("invitation");
          await clearPendingInvitation();
          if (!cancelled) router.replace("/(onboarding)/invitation");
        } else if (!cancelled) {
          setFlow(next);
          if (step === "review" && next.draft.path === "invitation") {
            await next.reinspectRestoredInvitation();
            if (!cancelled) setRevision((value) => value + 1);
          }
        }
      })().catch((caught) => {
        if (!cancelled)
          setError(
            apiMessage(
              caught instanceof Error ? caught : new Error(t("genericError")),
              language,
              t,
            ),
          );
      });
      return () => {
        cancelled = true;
      };
    },
    [router, step, language],
  );

  async function change(patch: Parameters<NativeOnboardingFlow["update"]>[0]) {
    if (!flow) return;
    setError(null);
    const saving = flow.update(patch);
    refresh();
    try {
      await saving;
    } catch (caught) {
      setError(
        apiMessage(caught instanceof Error ? caught : new Error(t("genericError")), language, t),
      );
    }
  }

  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (caught) {
      setError(
        apiMessage(caught instanceof Error ? caught : new Error(t("genericError")), language, t),
      );
    } finally {
      setBusy(false);
    }
  }

  async function goTo(nextStep: OnboardingStepDto) {
    if (!flow) return;
    await flow.goTo(nextStep);
    router.replace(nativeRoute(`/(onboarding)/${nextStep === "intention" ? "welcome" : nextStep}`));
  }

  function previousStep(): OnboardingStepDto | null {
    if (!flow?.draft.path) return null;
    const steps = stepsForPath(flow.draft.path);
    const index = steps.indexOf(step);
    return index > 0 ? steps[index - 1]! : null;
  }

  function nextStep(): OnboardingStepDto | null {
    if (!flow?.draft.path) return null;
    const steps = stepsForPath(flow.draft.path);
    return steps[steps.indexOf(step) + 1] ?? null;
  }

  async function continueFlow() {
    if (!flow) return;
    if (step === "organization") {
      if (!flow.draft.organizationName.trim()) throw new Error(t("required"));
      const available = await flow.gateway.organizations.checkNameAvailability({
        name: flow.draft.organizationName.trim(),
      });
      if (!available.available) throw new Error(t("organizationTaken"));
    }
    if (step === "competition" && !competitionFromDraft(flow.draft)) throw new Error(t("required"));
    if (step === "game-account" && !accountIsValid(flow.draft))
      throw new Error(t("incompleteAccount"));
    if (step === "invitation" && (!flow.preview || !flow.draft.invitationToken.trim())) {
      await flow.inspectInvitation();
      refresh();
    }
    const next = nextStep();
    if (next) await goTo(next);
  }

  function header() {
    const titleKey = {
      intention: "intention",
      organization: "organization",
      competition: "competition",
      invitation: "invitation",
      "game-account": "account",
      club: "club",
      review: "review",
      game: "account",
    } as const satisfies Record<OnboardingStepDto, MobileCopyKey>;
    return (
      <View style={{ gap: theme.spacing[3] }}>
        <Logo height={36} accessibilityLabel="Futrob" />
        <Text role="heading" accessibilityRole="header">
          {t(titleKey[step])}
        </Text>
        {flow?.draft.path ? (
          <Text role="caption" color="muted-foreground">
            {stepsForPath(flow.draft.path).indexOf(step) + 1} /{" "}
            {stepsForPath(flow.draft.path).length}
          </Text>
        ) : null}
        <Button variant="ghost" label={t("language")} onPress={toggleLanguage} />
      </View>
    );
  }

  return (
    <GateBoundary
      mode="onboarding"
      route={`/(onboarding)/${step === "intention" ? "welcome" : step}`}
      onReady={onReady}
    >
      <Screen scroll>
        <View style={{ gap: theme.spacing[6], maxWidth: 420, width: "100%", alignSelf: "center" }}>
          {header()}
          {error ? (
            <Text color="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {flow ? (
            <OnboardingFields
              flow={flow}
              step={step}
              t={t}
              language={language}
              busy={busy}
              clubQuery={clubQuery}
              setClubQuery={setClubQuery}
              clubs={clubs}
              setClubs={setClubs}
              change={change}
              run={run}
              continueFlow={continueFlow}
              goTo={goTo}
              refresh={refresh}
            />
          ) : (
            <EmptyState
              title={language === "es" ? "Cargando" : "Loading"}
              description={t("saved")}
            />
          )}
          {flow && step !== "intention" ? (
            <View style={{ gap: theme.spacing[2] }}>
              {step === "review" ? (
                <Button
                  label={t("confirm")}
                  loading={busy}
                  disabled={
                    missingRequiredStep(flow.draft) !== null ||
                    (flow.draft.path === "invitation" && !flow.preview)
                  }
                  onPress={() =>
                    void run(async () => {
                      const result = await flow.finish();
                      router.replace(nativeRoute(result.route));
                    })
                  }
                />
              ) : (
                <Button
                  label={t("continue")}
                  loading={busy}
                  onPress={() => void run(continueFlow)}
                />
              )}
              {previousStep() ? (
                <Button
                  variant="ghost"
                  label={t("back")}
                  disabled={busy}
                  onPress={() => void run(() => goTo(previousStep()!))}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </Screen>
    </GateBoundary>
  );
}
