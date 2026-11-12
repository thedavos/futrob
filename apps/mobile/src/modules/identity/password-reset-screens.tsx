import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, EmptyState, Input, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import {
  AUTH_ERROR_GENERIC,
  AuthError,
  INVALID_RESET_TOKEN,
  requestPasswordReset,
  resetPassword,
} from "@/modules/identity/auth-api";
import { AUTH_PASSWORD_HINT, validateEmail, validatePassword } from "./auth-validation";
import { localizeAuthMessage, useMobileCopy, type MobileCopyKey } from "./mobile-copy";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderRadius: theme.corner.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
        backgroundColor: `${theme.colors.danger}1a`,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
      }}
    >
      <Text role="caption" color="danger">
        {message}
      </Text>
    </View>
  );
}

function Frame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing[8], maxWidth: 400, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", gap: theme.spacing[4] }}>
          <Logo height={72} accessibilityLabel="Futrob" />
          <Text role="heading">{title}</Text>
          {subtitle ? (
            <Text role="subtitle" color="muted-foreground" style={{ textAlign: "center" }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </Screen>
  );
}

/** Asks for a reset link. The confirmation never says whether the account exists. */
export function ForgotPasswordScreen() {
  const router = useRouter();
  const { language, t } = useMobileCopy();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const backToLogin = (
    <Button
      variant="ghost"
      label={t("backToLogin")}
      onPress={() => router.replace("/(auth)/login")}
    />
  );

  async function handleSubmit() {
    const invalid = localizeAuthMessage(validateEmail(email.trim()), language);
    setEmailError(invalid);
    if (invalid) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (error) {
      setFormError(
        localizeAuthMessage(
          error instanceof AuthError ? error.message : AUTH_ERROR_GENERIC,
          language,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Frame title={t("forgotTitle")}>
        <EmptyState title={t("linkSentTitle")} description={t("linkSent")} action={backToLogin} />
      </Frame>
    );
  }

  return (
    <Frame title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      <FormError message={formError} />
      <Input
        label={t("email")}
        placeholder={t("emailPlaceholder")}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!submitting}
        error={emailError}
        value={email}
        onChangeText={setEmail}
      />
      <View style={{ gap: theme.spacing[4] }}>
        <Button label={t("sendLink")} loading={submitting} onPress={handleSubmit} />
        {backToLogin}
      </View>
    </Frame>
  );
}

type ResetOutcome = "form" | "done" | "invalid";

/**
 * Opened by the `futrob://reset-password` deep link, which keeps the token the email carried.
 * A used or expired link (`error`, or `INVALID_TOKEN` on submit) offers to ask for another.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const token = params.token ? params.token : null;
  const { language, t } = useMobileCopy();
  const [outcome, setOutcome] = useState<ResetOutcome>(
    token === null || params.error ? "invalid" : "form",
  );
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const notice = (title: MobileCopyKey, description: MobileCopyKey, action: React.ReactNode) => (
    <Frame title={t("resetTitle")}>
      <EmptyState title={t(title)} description={t(description)} action={action} />
    </Frame>
  );

  if (outcome === "invalid" || token === null) {
    return notice(
      "invalidLinkTitle",
      "invalidLink",
      <Button
        label={t("requestAnotherLink")}
        onPress={() => router.replace("/(auth)/forgot-password")}
      />,
    );
  }
  if (outcome === "done") {
    return notice(
      "passwordUpdatedTitle",
      "passwordUpdated",
      <Button label={t("login")} onPress={() => router.replace("/(auth)/login")} />,
    );
  }

  async function handleSubmit(resetToken: string) {
    const invalid = localizeAuthMessage(validatePassword(password), language);
    setPasswordError(invalid);
    if (invalid) return;
    setFormError(null);
    setSubmitting(true);
    try {
      // The reset ends the account's sessions on the server; a stored bearer of that account
      // gets 401 on its next request, which already sends this app back to sign-in.
      await resetPassword({ token: resetToken, newPassword: password });
      setOutcome("done");
    } catch (error) {
      if (error instanceof AuthError && error.code === INVALID_RESET_TOKEN) {
        setOutcome("invalid");
        return;
      }
      setFormError(
        localizeAuthMessage(
          error instanceof AuthError ? error.message : AUTH_ERROR_GENERIC,
          language,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Frame title={t("resetTitle")}>
      <FormError message={formError} />
      <View style={{ gap: theme.spacing[2] }}>
        <Input
          label={t("newPassword")}
          placeholder={t("newPasswordPlaceholder")}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
          editable={!submitting}
          error={passwordError}
          value={password}
          onChangeText={setPassword}
        />
        {passwordError ? null : (
          <Text role="caption" color="muted-foreground">
            {localizeAuthMessage(AUTH_PASSWORD_HINT, language)}
          </Text>
        )}
      </View>
      <Button label={t("savePassword")} loading={submitting} onPress={() => handleSubmit(token)} />
    </Frame>
  );
}
