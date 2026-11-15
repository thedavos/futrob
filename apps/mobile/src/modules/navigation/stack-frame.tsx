import type { ReactNode } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Button, Screen, Text } from "@/ui";

/**
 * A protected detail or operation screen that stacks above a context shell: back, title and
 * content. Without history (a deep link), back goes to `fallbackHref`.
 */
export function StackFrame({
  title,
  fallbackHref,
  children,
}: {
  title: string;
  fallbackHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { t } = useMobileCopy();
  return (
    <GateBoundary mode="ready">
      <Screen scroll centered={false}>
        <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <View style={{ alignItems: "flex-start", marginLeft: -theme.spacing[4] }}>
            <Button
              variant="ghost"
              label={t("back")}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace(nativeRoute(fallbackHref))
              }
            />
          </View>
          <Text role="heading" accessibilityRole="header">
            {title}
          </Text>
          {children}
        </View>
      </Screen>
    </GateBoundary>
  );
}
