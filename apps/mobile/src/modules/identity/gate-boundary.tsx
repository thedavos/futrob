import { useCallback, type ReactNode } from "react";
import { useExternalSync } from "@futrob/ui/hooks/use-external-sync";
import { AppState, ActivityIndicator, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { Button, EmptyState, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { useSessionGateQuery, useResetSessionGate } from "./use-session-gate-query.ts";
import { useMobileCopy } from "./mobile-copy.ts";
import { nativeRoute } from "./native-route.ts";

export function GateBoundary({
  children,
  mode,
  route,
}: {
  children?: ReactNode;
  mode: "onboarding" | "ready" | "entry";
  route?: string;
}) {
  const { t } = useMobileCopy();
  const query = useSessionGateQuery();
  const reset = useResetSessionGate();

  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query.refetch]),
  );
  useExternalSync(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void query.refetch();
    });
    return () => subscription.remove();
  }, [query.refetch]);

  const result = query.data;
  if (!result || query.isPending) {
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
          <Button label={t("retry")} onPress={reset} />
        </View>
      </Screen>
    );
  }
  if (
    mode === "entry" ||
    (result.kind === "ready" && result.route.startsWith("/roster-invitations/accept/")) ||
    result.kind !== mode ||
    (mode === "onboarding" && route && result.route !== route)
  ) {
    return <Redirect href={nativeRoute(result.route)} />;
  }
  return <>{children}</>;
}
