import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { savePendingInvitation, clearPendingInvitation } from "@/modules/identity/onboarding-draft";
import { resolveSessionGate } from "@/modules/identity/session-gate";
import { Button, EmptyState, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";

export default function InvitationLinkRoute() {
  const { plainToken } = useLocalSearchParams<{ plainToken: string }>();
  const router = useRouter();
  const { t } = useMobileCopy();
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!plainToken) {
      setError(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      await savePendingInvitation(plainToken);
      const gate = await resolveSessionGate();
      if (cancelled) return;
      if (gate.kind === "error") {
        setError(true);
        return;
      }
      if (gate.kind === "ready") {
        const accepted = await getFutrobClient().competitions.acceptInvitation({
          token: plainToken,
        });
        await clearPendingInvitation();
        if (!cancelled)
          router.replace(
            nativeRoute(
              `/orgs/${encodeURIComponent(accepted.destination.organizationId)}/competitions/${encodeURIComponent(accepted.destination.competitionId)}`,
            ),
          );
        return;
      }
      router.replace(nativeRoute(gate.route));
    })().catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [plainToken, revision, router]);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing[4] }}>
        {error ? (
          <EmptyState
            title={t("invitationErrorTitle")}
            description={t("invitationErrorDescription")}
            action={
              <Button
                label={t("retry")}
                onPress={() => {
                  setError(false);
                  setRevision((value) => value + 1);
                }}
              />
            }
          />
        ) : (
          <Text>{t("invitationLoading")}</Text>
        )}
      </View>
    </Screen>
  );
}
