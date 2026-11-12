import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { logout } from "@/modules/identity/session-lifecycle";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { theme } from "@/theme/theme";
import { Button, List, ListItem, Screen, Text } from "@/ui";
import { navigationCopy } from "./navigation-copy";

/**
 * «Más»: secondary destinations and account actions, the same in every context. Context
 * destinations that do not earn a tab are listed here as they are built.
 */
export function MoreScreen() {
  const router = useRouter();
  const { language, t, toggleLanguage } = useMobileCopy();
  const copy = navigationCopy(language);

  return (
    <Screen scroll edges={["left", "right"]} centered={false}>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Text role="heading" accessibilityRole="header">
          {copy.more.title}
        </Text>
        <List>
          <ListItem
            title={copy.more.account}
            description={copy.more.accountDescription}
            onPress={() => router.push(nativeRoute("/account"))}
          />
          <ListItem
            title={t("language")}
            description={copy.more.languageDescription}
            onPress={toggleLanguage}
          />
        </List>
        <Button
          variant="outline"
          label={copy.more.signOut}
          onPress={() => void logout(() => router.replace(LOGIN_ROUTE))}
        />
      </View>
    </Screen>
  );
}
