import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import {
  acceptRosterInvitationLink,
  clearPendingRosterInvitation,
} from "@/modules/identity/roster-invitation-link";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { nativeRoute } from "@/modules/identity/native-route";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { Button, EmptyState, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";

export default function RosterInvitationRoute() {
  const router = useRouter();
  const { token = "" } = useLocalSearchParams<{ token?: string }>();
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  const { t, language } = useMobileCopy();
  const query = useQuery({
    queryKey: ["session", generation, "roster-invitation-link", token],
    queryFn: async () => {
      const route = await acceptRosterInvitationLink(token);
      if (route === "/player") {
        await queryClient.resetQueries({ queryKey: mobileQueryKeys.sessionGate(generation) });
        await queryClient.invalidateQueries({ queryKey: ["session", generation, "player-home"] });
      }
      return route;
    },
    retry: false,
    staleTime: Infinity,
  });
  if (query.data) return <Redirect href={nativeRoute(query.data)} />;
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing[4] }}>
        {query.isError ? (
          <EmptyState
            title={t("invitationErrorTitle")}
            description={t("invitationErrorDescription")}
            action={
              <View style={{ gap: theme.spacing[2] }}>
                <Button label={t("retry")} onPress={() => void query.refetch()} />
                <Button
                  variant="outline"
                  label={language === "es" ? "Salir" : "Exit"}
                  onPress={() => {
                    void clearPendingRosterInvitation().then(async () => {
                      await queryClient.resetQueries({
                        queryKey: mobileQueryKeys.sessionGate(generation),
                      });
                      router.replace(nativeRoute("/player"));
                    });
                  }}
                />
              </View>
            }
          />
        ) : (
          <Text>{t("invitationLoading")}</Text>
        )}
      </View>
    </Screen>
  );
}
