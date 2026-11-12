import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Button, Screen, Text } from "@/ui";
import { accountCopy } from "./account-copy.ts";

export function useAccountCopy() {
  const mobile = useMobileCopy();
  return { ...mobile, copy: accountCopy(mobile.language) };
}

export function AccountFrame({
  title,
  children,
  backHref = "/account",
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
}) {
  const router = useRouter();
  const { copy } = useAccountCopy();
  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "flex-start" }}>
          <Button
            variant="ghost"
            label={copy.back}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace(nativeRoute(backHref))
            }
          />
        </View>
        <Text role="heading" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
    </Screen>
  );
}

export function Status({ children }: { children: string }) {
  return (
    <Text color="muted-foreground" accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

export function Problem({ children }: { children: string }) {
  return (
    <Text color="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {children}
    </Text>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
