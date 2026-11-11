import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  emailChangeProblem,
  PASSWORD_MAX_LENGTH,
  passwordChangeProblem,
  toAccountSessions,
} from "@futrob/sdk";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { nativeRoute } from "@/modules/identity/native-route";
import { getSession } from "@/modules/identity/session-store";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { theme } from "@/theme/theme";
import { Button, EmptyState, Input, Text } from "@/ui";
import {
  AccountAuthError,
  changeAccountPassword,
  listDeviceSessions,
  requestAccountEmailChange,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
} from "./account-auth-api.ts";
import { deviceName, type AccountCopy } from "./account-copy.ts";
import { AccountFrame, Loading, Problem, Status, useAccountCopy } from "./account-frame.tsx";

/** `/account`: the four sections; language applies on the spot like the web modal. */
export function AccountMenuScreen() {
  const router = useRouter();
  const { copy, toggleLanguage } = useAccountCopy();
  const go = (route: string) => router.push(nativeRoute(route));
  return (
    <GateBoundary mode="ready">
      <AccountFrame title={copy.title}>
        <View style={{ gap: theme.spacing[2] }}>
          <Text role="title" accessibilityRole="header">
            {copy.preferences}
          </Text>
          <Text>
            {copy.language}: {copy.languageValue}
          </Text>
          <Button variant="outline" label={copy.languageSwitch} onPress={toggleLanguage} />
          <Text role="caption" color="muted-foreground">
            {copy.languageHint}
          </Text>
        </View>
        <Button variant="outline" label={copy.security} onPress={() => go("/account/security")} />
        <Button variant="outline" label={copy.sessions} onPress={() => go("/account/sessions")} />
        <Button
          variant="outline"
          label={copy.deleteAccount}
          onPress={() => go("/account/delete")}
        />
      </AccountFrame>
    </GateBoundary>
  );
}

export function SecurityScreen() {
  const { copy } = useAccountCopy();
  return (
    <GateBoundary mode="ready">
      <AccountFrame title={copy.security}>
        <EmailForm copy={copy} />
        <PasswordForm copy={copy} />
      </AccountFrame>
    </GateBoundary>
  );
}

function EmailForm({ copy }: { copy: AccountCopy }) {
  const generation = useSessionGeneration();
  const current = useQuery({
    queryKey: [...mobileQueryKeys.accountSessions(generation), "email"],
    queryFn: async () => (await getSession())?.user.email ?? "",
  });
  const [newEmail, setNewEmail] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: async (email: string) => {
      await requestAccountEmailChange(email);
      return email;
    },
    onSuccess: () => setNewEmail(""),
    onError: (error) =>
      setProblem(
        error instanceof AccountAuthError && error.code === "CHANGE_EMAIL_DISABLED"
          ? copy.emailUnavailable
          : copy.emailError,
      ),
  });
  function submit() {
    change.reset();
    const found = emailChangeProblem({ currentEmail: current.data ?? "", newEmail });
    setProblem(
      found === "invalid" ? copy.emailInvalid : found === "unchanged" ? copy.emailUnchanged : null,
    );
    if (!found) change.mutate(newEmail.trim().toLowerCase());
  }
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <Text role="title" accessibilityRole="header">
        {copy.email}
      </Text>
      {current.data ? (
        <Text color="muted-foreground">{copy.emailCurrent(current.data)}</Text>
      ) : null}
      <Input
        label={copy.emailNew}
        hint={copy.emailHint}
        error={problem}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        editable={!change.isPending}
        value={newEmail}
        onChangeText={(value) => {
          setNewEmail(value);
          setProblem(null);
        }}
      />
      {change.isSuccess ? <Status>{copy.emailSent(change.data)}</Status> : null}
      <Button
        variant="outline"
        label={copy.emailSubmit}
        loading={change.isPending}
        disabled={change.isPending || !newEmail.trim()}
        onPress={submit}
      />
    </View>
  );
}

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function PasswordForm({ copy }: { copy: AccountCopy }) {
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [invalid, setInvalid] = useState(false);
  const change = useMutation({
    mutationFn: () =>
      changeAccountPassword({ currentPassword: passwords.current, newPassword: passwords.next }),
    onSuccess: () => setPasswords(EMPTY_PASSWORDS),
  });
  const failure = invalid ? copy.passwordInvalid : change.isError ? copy.passwordError : null;
  const fields = [
    ["current", copy.currentPassword],
    ["next", copy.newPassword],
    ["confirm", copy.confirmPassword],
  ] as const;
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <Text role="title" accessibilityRole="header">
        {copy.password}
      </Text>
      <Text role="caption" color="muted-foreground">
        {copy.passwordHint}
      </Text>
      {fields.map(([key, label]) => (
        <Input
          key={key}
          label={label}
          secureTextEntry
          autoComplete={key === "current" ? "current-password" : "new-password"}
          maxLength={PASSWORD_MAX_LENGTH}
          editable={!change.isPending}
          value={passwords[key]}
          onChangeText={(value) => {
            setPasswords({ ...passwords, [key]: value });
            setInvalid(false);
            change.reset();
          }}
        />
      ))}
      {failure ? <Problem>{failure}</Problem> : null}
      {change.isSuccess ? <Status>{copy.passwordChanged}</Status> : null}
      <Button
        variant="outline"
        label={copy.passwordSubmit}
        loading={change.isPending}
        disabled={change.isPending || !Object.values(passwords).some(Boolean)}
        onPress={() => {
          change.reset();
          const problem = passwordChangeProblem(passwords);
          setInvalid(problem !== null);
          if (!problem) change.mutate();
        }}
      />
    </View>
  );
}

export function SessionsScreen() {
  const { copy, language } = useAccountCopy();
  const generation = useSessionGeneration();
  const queryClient = useQueryClient();
  const key = mobileQueryKeys.accountSessions(generation);
  const sessions = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { sessions: listed, currentToken } = await listDeviceSessions();
      const current = listed.find((session) => session.token === currentToken)?.id ?? null;
      return toAccountSessions(listed, current);
    },
  });
  const revoke = useMutation({
    mutationFn: (token: string | null) =>
      token ? revokeDeviceSession(token) : revokeOtherDeviceSessions(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const format = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" });
  const others = sessions.data?.filter((session) => !session.current) ?? [];
  return (
    <GateBoundary mode="ready">
      <AccountFrame title={copy.sessions}>
        <Text color="muted-foreground">{copy.sessionsHint}</Text>
        {sessions.isPending ? (
          <Loading label={copy.sessionsLoading} />
        ) : sessions.isError ? (
          <EmptyState
            title={copy.sessionsError}
            action={<Button label={copy.retry} onPress={() => void sessions.refetch()} />}
          />
        ) : (
          <>
            {sessions.data.map((session) => {
              const name = deviceName(session.device, copy);
              return (
                <View
                  key={session.id}
                  style={{
                    gap: theme.spacing[2],
                    paddingVertical: theme.spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <Text role="label">
                    {name}
                    {session.current ? ` · ${copy.sessionCurrent}` : ""}
                  </Text>
                  <Text role="caption" color="muted-foreground">
                    {copy.sessionActivity(
                      format.format(session.signedInAt),
                      format.format(session.lastActiveAt),
                    )}
                  </Text>
                  {session.current ? null : (
                    <Button
                      variant="outline"
                      label={copy.sessionRevoke}
                      accessibilityLabel={copy.sessionRevokeLabel(name)}
                      disabled={revoke.isPending}
                      onPress={() => revoke.mutate(session.token)}
                    />
                  )}
                </View>
              );
            })}
            {others.length === 0 ? (
              <Text color="muted-foreground">{copy.sessionsOnlyThis}</Text>
            ) : null}
            {revoke.isError ? <Problem>{copy.sessionsRevokeError}</Problem> : null}
            {others.length > 1 ? (
              <Button
                variant="outline"
                label={copy.sessionsRevokeOthers}
                disabled={revoke.isPending}
                onPress={() => revoke.mutate(null)}
              />
            ) : null}
          </>
        )}
      </AccountFrame>
    </GateBoundary>
  );
}
