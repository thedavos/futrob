import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, ActivityIndicator, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Button, EmptyState, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { resolveSessionGate, type GateResult } from "./session-gate.ts";
import { useMobileCopy } from "./mobile-copy.ts";
import { nativeRoute } from "./native-route.ts";

export function GateBoundary({
  children,
  mode,
  route,
  onReady,
}: {
  children?: ReactNode;
  mode: "onboarding" | "ready" | "entry";
  route?: string;
  onReady?: (result: GateResult) => void | (() => void);
}) {
  const router = useRouter();
  const { t } = useMobileCopy();
  const [result, setResult] = useState<GateResult | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    let disposeReady: void | (() => void);
    setResult(null);
    void resolveSessionGate().then((next) => {
      if (cancelled) return;
      setResult(next);
      if (next.kind === "error") return;
      if (
        mode === "entry" ||
        next.kind !== mode ||
        (mode === "onboarding" && route && next.route !== route)
      ) {
        router.replace(nativeRoute(next.route));
        return;
      }
      disposeReady = onReady?.(next);
    });
    return () => {
      cancelled = true;
      disposeReady?.();
    };
  }, [mode, onReady, revision, route, router]);

  if (!result || (result.kind !== "error" && mode === "entry")) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }
  if (result.kind === "error") {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing[4] }}>
          <EmptyState title={t("gateErrorTitle")} description={t("gateErrorDescription")} />
          {result.retryAfterSeconds ? (
            <Text role="caption">
              {t("wait")} {result.retryAfterSeconds} s.
            </Text>
          ) : null}
          <Button label={t("retry")} onPress={refresh} />
        </View>
      </Screen>
    );
  }
  if (result.kind !== mode || (mode === "onboarding" && route && result.route !== route))
    return null;
  return <>{children}</>;
}
