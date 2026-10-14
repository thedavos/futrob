import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Button, EmptyState, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { retryInvitationLinkAccept } from "@/modules/identity/invitation-link-accept";
import { useInvitationLinkAccept } from "@/modules/identity/use-invitation-link-accept";

export default function InvitationLinkRoute() {
  const { plainToken } = useLocalSearchParams<{ plainToken?: string }>();
  const { t } = useMobileCopy();
  const token = plainToken ?? "";
  const state = useInvitationLinkAccept(token);

  if (state.status === "ready") {
    return <Redirect href={nativeRoute(state.route)} />;
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing[4] }}>
        {state.status === "error" || token.length === 0 ? (
          <EmptyState
            title={t("invitationErrorTitle")}
            description={t("invitationErrorDescription")}
            action={<Button label={t("retry")} onPress={() => retryInvitationLinkAccept(token)} />}
          />
        ) : (
          <Text>{t("invitationLoading")}</Text>
        )}
      </View>
    </Screen>
  );
}
