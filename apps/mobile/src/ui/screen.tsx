import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme/theme";

/**
 * Screen container: token background + safe-area padding on all edges.
 * `scroll` renders children inside a ScrollView with keyboard avoidance
 * (padding on iOS, height on Android) and keyboardShouldPersistTaps so form
 * buttons stay tappable while the keyboard is open.
 */
export function Screen({
  children,
  scroll = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const style = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: Math.max(insets.left, theme.spacing[6]),
    paddingRight: Math.max(insets.right, theme.spacing[6]),
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
              justifyContent: "center",
              paddingVertical: theme.spacing[8],
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
