import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { logout } from "@/modules/identity/session-lifecycle";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { theme } from "@/theme/theme";
import type { WorkspaceContext } from "@futrob/sdk";
import { Button, List, ListItem, ListSection, Screen, Text } from "@/ui";
import { contextLinks } from "./nav-registry";
import { navigationCopy } from "./navigation-copy";
import { useContextAccess } from "./use-context-access";

/**
 * «Más»: the context's destinations that do not earn a tab (see `contextLinks`), then account
 * actions, the same in every context.
 */
export function MoreScreen({ context }: { context: WorkspaceContext }) {
  const router = useRouter();
  const { language, t, toggleLanguage } = useMobileCopy();
  const copy = navigationCopy(language);
  const links = contextLinks(context, useContextAccess(context));

  return (
    <Screen scroll edges={["left", "right"]} centered={false}>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Text role="heading" accessibilityRole="header">
          {copy.more.title}
        </Text>
        {links.length > 0 ? (
          <ListSection title={copy.context[context.kind]}>
            <List>
              {links.map((link) => (
                <ListItem
                  key={link.id}
                  title={copy.links[link.id]}
                  onPress={() => router.push(nativeRoute(link.href))}
                />
              ))}
            </List>
          </ListSection>
        ) : null}
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
