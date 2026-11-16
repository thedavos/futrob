import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { theme } from "@/theme/theme";
import { Button, Text } from "@/ui";
import {
  AccountAuthError,
  getAccountEmailStatus,
  resendEmailVerification,
} from "./account-auth-api.ts";
import { Problem, Status, useAccountCopy } from "./account-frame.tsx";

/**
 * Persistent notice while the signed-in account has not confirmed its email (AUTH-02). It never
 * blocks the app; the link opens the web landing page and the notice goes once it is used.
 */
export function EmailVerificationNotice() {
  const { copy } = useAccountCopy();
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  const queryKey = mobileQueryKeys.emailVerification(generation);
  const status = useQuery({ queryKey, queryFn: getAccountEmailStatus });
  const resend = useMutation({
    mutationFn: (email: string) => resendEmailVerification(email),
    onError: (error) => {
      if (error instanceof AccountAuthError && error.code === "EMAIL_ALREADY_VERIFIED") {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  // A failed status check stays quiet: the notice is a reminder, not a gate.
  const account = status.data;
  if (account == null || account.verified) return null;

  const rateLimited = resend.error instanceof AccountAuthError && resend.error.status === 429;
  return (
    <View
      accessibilityRole="summary"
      style={{
        gap: theme.spacing[2],
        borderRadius: theme.corner.lg,
        borderWidth: 1,
        borderColor: theme.colors.warning,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing[4],
      }}
    >
      <Text role="label">{copy.verifyTitle}</Text>
      <Text color="muted-foreground">{copy.verifyBody(account.email)}</Text>
      <Button
        variant="outline"
        label={resend.isPending ? copy.verifySending : copy.verifyResend}
        disabled={resend.isPending}
        onPress={() => resend.mutate(account.email)}
      />
      {resend.isSuccess ? <Status>{copy.verifySent}</Status> : null}
      {resend.isError ? (
        <Problem>{rateLimited ? copy.verifyRateLimited : copy.verifyError}</Problem>
      ) : null}
    </View>
  );
}
