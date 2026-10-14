import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { savePendingInvitation, clearPendingInvitation } from "@/modules/identity/onboarding-draft";
import { resolveSessionGate } from "@/modules/identity/session-gate";
import { Button, EmptyState, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { mobileQueryKeys } from "@/modules/query/query-keys";

export default function InvitationLinkRoute() {
  const { plainToken } = useLocalSearchParams<{ plainToken?: string }>();
  const { t } = useMobileCopy();
  const token = plainToken ?? "";
  const query = useQuery({
    queryKey: mobileQueryKeys.invitationAccept(token),
    enabled: token.length > 0,
    retry: false,
    queryFn: async () => {
      await savePendingInvitation(token);
      const gate = await resolveSessionGate();
      if (gate.kind === "error") throw new Error("gate");
      if (gate.kind === "ready") {
        const accepted = await getFutrobClient().competitions.acceptInvitation({
          token,
        });
        await clearPendingInvitation();
        return {
          route: `/orgs/${encodeURIComponent(accepted.destination.organizationId)}/competitions/${encodeURIComponent(accepted.destination.competitionId)}`,
        };
      }
      return { route: gate.route };
    },
  });

  if (query.data) {
    return <Redirect href={nativeRoute(query.data.route)} />;
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing[4] }}>
        {query.isError || token.length === 0 ? (
          <EmptyState
            title={t("invitationErrorTitle")}
            description={t("invitationErrorDescription")}
            action={<Button label={t("retry")} onPress={() => void query.refetch()} />}
          />
        ) : (
          <Text>{t("invitationLoading")}</Text>
        )}
      </View>
    </Screen>
  );
}
