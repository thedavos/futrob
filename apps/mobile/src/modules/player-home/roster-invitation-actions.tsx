import { useMutation } from "@tanstack/react-query";
import type { RosterInvitationInboxItemDto } from "@futrob/api-contracts";
import { View } from "react-native";
import { getFutrobClient } from "@/modules/api/futrob-client";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { theme } from "@/theme/theme";
import { Button, Text } from "@/ui";

export function RosterInvitationActions({
  invitations,
  language,
  refresh,
}: {
  invitations: RosterInvitationInboxItemDto[];
  language: MobileLanguage;
  refresh: () => void;
}) {
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      getFutrobClient().teams.rosterInvitations.respond(id, { action }),
    onSuccess: refresh,
  });
  return invitations
    .filter((item) => item.status === "pending")
    .map((item) => (
      <View key={item.invitationId} style={{ gap: theme.spacing[2] }}>
        <Text>
          {item.teamName} · {item.clubName}
        </Text>
        <Button
          label={language === "es" ? "Aceptar" : "Accept"}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate({ id: item.invitationId, action: "accept" })}
        />
        <Button
          variant="outline"
          label={language === "es" ? "Rechazar" : "Decline"}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate({ id: item.invitationId, action: "decline" })}
        />
        {mutation.isError && mutation.variables?.id === item.invitationId ? (
          <Text>
            {language === "es"
              ? "No se pudo responder. Inténtalo de nuevo."
              : "Couldn't respond. Try again."}
          </Text>
        ) : null}
      </View>
    ));
}
