import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme/theme";

export type ScreenEdge = "top" | "bottom" | "left" | "right";

const ALL_EDGES: readonly ScreenEdge[] = ["top", "bottom", "left", "right"];

/**
 * Screen container: token background + safe-area padding on `edges` (all by default). Inside a
 * context shell the header and tab bar already pad the top and bottom, so tab screens pass
 * `edges={["left", "right"]}`.
 * `scroll` renders children inside a ScrollView with keyboard avoidance
 * (padding on iOS, height on Android) and keyboardShouldPersistTaps so form
 * buttons stay tappable while the keyboard is open. `centered` (default) centers short
 * content vertically, as auth and onboarding do; tab screens start at the top.
 */
export function Screen({
  children,
  scroll = false,
  edges = ALL_EDGES,
  centered = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: readonly ScreenEdge[];
  centered?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const inset = (edge: ScreenEdge) => (edges.includes(edge) ? insets[edge] : 0);
  const style = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: inset("top"),
    paddingBottom: inset("bottom"),
    paddingLeft: Math.max(inset("left"), theme.spacing[6]),
    paddingRight: Math.max(inset("right"), theme.spacing[6]),
  };

  if (scroll) {
    return (
      <View style={style}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: centered ? "center" : "flex-start",
              paddingVertical: centered ? theme.spacing[8] : theme.spacing[5],
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return <View style={style}>{children}</View>;
}
