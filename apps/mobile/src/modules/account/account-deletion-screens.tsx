import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountDeletionAvailability,
  FutrobApiError,
  PASSWORD_MAX_LENGTH,
  projectedAccountDeletionDate,
} from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { nativeRoute } from "@/modules/identity/native-route";
import { logout } from "@/modules/identity/session-lifecycle";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { theme } from "@/theme/theme";
import { Button, EmptyState, Input, Screen, Text } from "@/ui";
import type { AccountCopy } from "./account-copy.ts";
import { AccountFrame, Loading, Problem, Status, useAccountCopy } from "./account-frame.tsx";

function deleteProblem(error: Error, copy: AccountCopy): string {
  if (error instanceof FutrobApiError && error.code === "identity.reauthentication_failed") {
    return copy.deleteWrongPassword;
  }
  if (error instanceof FutrobApiError && error.code === "identity.account_deletion_blocked") {
    return copy.deleteBlocked;
  }
  return copy.deleteError;
}

export function DeleteAccountScreen() {
  const router = useRouter();
  const { copy, language } = useAccountCopy();
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  const key = mobileQueryKeys.accountDeletion(generation);
  const status = useQuery({
    queryKey: key,
    queryFn: () => getFutrobClient().identity.getAccountDeletion(),
  });
  const [password, setPassword] = useState("");
  const request = useMutation({
    mutationFn: () => getFutrobClient().identity.requestAccountDeletion({ password }),
    // Every session ended on the server, this one included: drop it here and go to sign-in.
    onSuccess: () => logout(() => router.replace(LOGIN_ROUTE)),
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const format = new Intl.DateTimeFormat(language, { dateStyle: "long" });
  const availability = status.data ? accountDeletionAvailability(status.data) : null;
  return (
    <GateBoundary mode="ready">
      <AccountFrame title={copy.deleteAccount}>
        <Text>{copy.deleteIntro}</Text>
        <View style={{ gap: theme.spacing[2] }}>
          <Text role="label">{copy.deleteRemovedTitle}</Text>
          <Text color="muted-foreground">{copy.deleteRemoved}</Text>
          <Text role="label">{copy.deleteKeptTitle}</Text>
          <Text color="muted-foreground">{copy.deleteKept}</Text>
        </View>
        {status.isPending ? (
          <Loading label={copy.deleteLoading} />
        ) : status.isError || !availability ? (
          <EmptyState
            title={copy.deleteStatusError}
            action={<Button label={copy.retry} onPress={() => void status.refetch()} />}
          />
        ) : availability.kind === "blocked" ? (
          <View style={{ gap: theme.spacing[2] }} accessibilityRole="alert">
            <Text role="label">{copy.deleteBlockedTitle}</Text>
            {availability.blockers.map((blocker) => (
              <Text
                key={blocker.kind === "sole-organizer" ? blocker.organizationId : blocker.teamId}
              >
                • {copy.deleteBlocker(blocker)}
              </Text>
            ))}
            {request.isError ? <Problem>{copy.deleteBlocked}</Problem> : null}
          </View>
        ) : availability.kind === "scheduled" ? (
          <Status>{copy.scheduledTitle(format.format(availability.scheduledFor))}</Status>
        ) : (
          <View style={{ gap: theme.spacing[3] }}>
            <Text>
              {copy.deleteConfirmDescription(
                format.format(projectedAccountDeletionDate(new Date())),
              )}
            </Text>
            <Input
              label={copy.deletePassword}
              secureTextEntry
              autoComplete="current-password"
              maxLength={PASSWORD_MAX_LENGTH}
              editable={!request.isPending}
              error={request.isError ? deleteProblem(request.error, copy) : null}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                request.reset();
              }}
            />
            <Button
              variant="destructive"
              label={copy.deleteConfirm}
              loading={request.isPending}
              disabled={request.isPending || !password}
              onPress={() => request.mutate()}
            />
          </View>
        )}
      </AccountFrame>
    </GateBoundary>
  );
}

/** What a scheduled account sees after signing in: the date and how to cancel. */
export function DeletionScheduledScreen() {
  return (
    <GateBoundary mode="deletion-scheduled">
      <DeletionScheduledBody />
    </GateBoundary>
  );
}

function DeletionScheduledBody() {
  const router = useRouter();
  const { copy, language } = useAccountCopy();
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: mobileQueryKeys.accountDeletion(generation),
    queryFn: () => getFutrobClient().identity.getAccountDeletion(),
  });
  const cancel = useMutation({
    mutationFn: () => getFutrobClient().identity.cancelAccountDeletion(),
    onSuccess: async (status) => {
      queryClient.setQueryData(mobileQueryKeys.accountDeletion(generation), status);
      await queryClient.resetQueries({ queryKey: mobileQueryKeys.sessionGate(generation) });
      router.replace(nativeRoute("/"));
    },
  });
  const availability = status.data ? accountDeletionAvailability(status.data) : null;
  const date =
    availability?.kind === "scheduled"
      ? new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(availability.scheduledFor)
      : null;
  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        {date ? (
          <Text role="heading" accessibilityRole="header">
            {copy.scheduledTitle(date)}
          </Text>
        ) : status.isError ? (
          <EmptyState
            title={copy.deleteStatusError}
            action={<Button label={copy.retry} onPress={() => void status.refetch()} />}
          />
        ) : (
          <Loading label={copy.deleteLoading} />
        )}
        <Text color="muted-foreground">{copy.scheduledBody}</Text>
        {cancel.isError ? <Problem>{copy.cancelError}</Problem> : null}
        <Button
          label={copy.cancelDeletion}
          loading={cancel.isPending}
          disabled={cancel.isPending}
          onPress={() => cancel.mutate()}
        />
        <Button
          variant="ghost"
          label={copy.signOut}
          disabled={cancel.isPending}
          onPress={() => void logout(() => router.replace(LOGIN_ROUTE))}
        />
      </View>
    </Screen>
  );
}
