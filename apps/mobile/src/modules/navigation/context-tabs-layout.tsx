import { forwardRef } from "react";
import { Pressable, View } from "react-native";
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { WorkspaceContext } from "@futrob/sdk";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Text } from "@/ui";
import { ContextSelector } from "./context-selector";
import { contextTabs } from "./nav-registry";
import { navigationCopy } from "./navigation-copy";
import { useContextAccess } from "./use-context-access";

/**
 * Shell of one context: header with the context selector, the focused tab, and the bottom
 * tab bar. Mount it from the context's `(tabs)/_layout.tsx`. Detail screens live outside the
 * `(tabs)` group so they stack above the shell.
 */
export function ContextTabsLayout({ context }: { context: WorkspaceContext }) {
  return (
    <GateBoundary mode="ready">
      <ContextShell context={context} />
    </GateBoundary>
  );
}

function ContextShell({ context }: { context: WorkspaceContext }) {
  const insets = useSafeAreaInsets();
  const { language } = useMobileCopy();
  const copy = navigationCopy(language);
  const tabs = contextTabs(context, useContextAccess(context));

  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing[2],
          paddingBottom: theme.spacing[2],
          paddingLeft: Math.max(insets.left, theme.spacing[6]),
          paddingRight: Math.max(insets.right, theme.spacing[6]),
          borderBottomWidth: 1,
          borderBottomColor: theme.colors["border-subtle"],
        }}
      >
        <ContextSelector context={context} />
      </View>
      <TabSlot />
      <TabList asChild>
        <View
          accessibilityRole="tablist"
          accessibilityLabel={copy.tabBar}
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          {tabs.map((tab) => (
            <TabTrigger key={tab.id} name={tab.id} href={nativeRoute(tab.href)} asChild>
              <ContextTabButton label={copy.tabs[tab.id]} allowed={tab.allowed} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

type ContextTabButtonProps = TabTriggerSlotProps & { label: string; allowed: boolean };

/** A bottom tab: 56dp tall, lime top indicator and semibold label when focused. */
const ContextTabButton = forwardRef<View, ContextTabButtonProps>(function ContextTabButton(
  { label, allowed, isFocused = false, onPress, onLongPress },
  ref,
) {
  if (!allowed && !isFocused) {
    return <View ref={ref} style={{ display: "none" }} />;
  }
  return (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityLabel={label}
      aria-selected={isFocused}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        minHeight: 56,
        alignItems: "center",
        justifyContent: "center",
        borderTopWidth: 2,
        borderTopColor: isFocused ? theme.colors.primary : "transparent",
        marginTop: -1,
      }}
    >
      <Text
        role="label"
        color={isFocused ? "foreground" : "muted-foreground"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          fontFamily: isFocused ? theme.fontFamily.semibold : theme.fontFamily.medium,
          paddingHorizontal: theme.spacing[1],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});
