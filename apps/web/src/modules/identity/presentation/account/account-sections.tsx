import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Field,
  FieldLabel,
  Input,
  SectionTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import { sidebarLayoutSchema, type SidebarLayoutDto } from "@futrob/api-contracts";
import { emailChangeProblem, PASSWORD_MAX_LENGTH, passwordChangeProblem } from "@futrob/sdk";
import {
  DEFAULT_SIDEBAR_LAYOUT,
  useActorPreferencesQuery,
  useSaveActorPreferencesMutation,
} from "@/modules/identity/presentation/identity-queries.ts";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { AccountAuth } from "./account-auth.ts";
import { useAccountSessionsQuery } from "./account-queries.ts";
import { styles } from "./account.styles.ts";

const SIDEBAR_LAYOUT_LABELS = {
  navigation: "settings.sidebarLayoutNavigation",
  "pending-queue": "settings.sidebarLayoutPendingQueue",
} as const satisfies Record<SidebarLayoutDto, string>;

/** Each choice applies on selection; a failure keeps the previous value and says so. */
export function PreferencesSection() {
  const { t, locale, setLocale } = useI18n();
  const language = useMutation({ mutationFn: (next: Locale) => setLocale(next) });
  const preferences = useActorPreferencesQuery();
  const saveLayout = useSaveActorPreferencesMutation();
  const savedLayout = preferences.data?.sidebarLayout ?? DEFAULT_SIDEBAR_LAYOUT;
  const shownLanguage = language.isPending ? language.variables : locale;
  const shownLayout = saveLayout.isPending ? saveLayout.variables.sidebarLayout : savedLayout;
  return (
    <div {...applyStyles(styles.stack)}>
      <Field invalid={language.isError}>
        <FieldLabel htmlFor="settings-language">{t("settings.language")}</FieldLabel>
        <Select
          disabled={language.isPending}
          items={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
          ]}
          onValueChange={(value) => {
            saveLayout.reset();
            language.mutate(value === "en" ? "en" : "es");
          }}
          value={shownLanguage}
        >
          <SelectTrigger aria-describedby="settings-language-hint" id="settings-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
        <Caption id="settings-language-hint">{t("settings.languageHint")}</Caption>
      </Field>
      <Field invalid={saveLayout.isError}>
        <FieldLabel htmlFor="settings-sidebar-layout">{t("settings.sidebarLayout")}</FieldLabel>
        <Select
          disabled={saveLayout.isPending || preferences.isPending}
          items={sidebarLayoutSchema.options.map((value) => ({
            value,
            label: t(SIDEBAR_LAYOUT_LABELS[value]),
          }))}
          onValueChange={(value) => {
            const sidebarLayout = sidebarLayoutSchema.parse(value);
            language.reset();
            if (sidebarLayout !== savedLayout) saveLayout.mutate({ sidebarLayout });
          }}
          value={shownLayout}
        >
          <SelectTrigger
            aria-describedby="settings-sidebar-layout-hint"
            id="settings-sidebar-layout"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sidebarLayoutSchema.options.map((value) => (
              <SelectItem key={value} value={value}>
                {t(SIDEBAR_LAYOUT_LABELS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Caption id="settings-sidebar-layout-hint">{t("settings.sidebarLayoutHint")}</Caption>
      </Field>
      {language.isError || saveLayout.isError ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>
            {t(language.isError ? "settings.languageError" : "settings.sidebarLayoutError")}
          </AlertDescription>
        </Alert>
      ) : null}
      {language.isSuccess || saveLayout.isSuccess ? (
        <p role="status">
          <Caption>{t("settings.saved")}</Caption>
        </p>
      ) : null}
    </div>
  );
}

export function SecuritySection({ auth }: { readonly auth: AccountAuth }) {
  return (
    <div {...applyStyles(styles.stack)}>
      <EmailForm auth={auth} />
      <PasswordForm auth={auth} />
    </div>
  );
}

type EmailFailure = "invalid" | "unchanged" | "unavailable" | "failed";

const EMAIL_FAILURE_COPY = {
  invalid: "settings.emailInvalid",
  unchanged: "settings.emailUnchanged",
  unavailable: "settings.emailUnavailable",
  failed: "settings.emailError",
} as const satisfies Record<EmailFailure, string>;

function EmailForm({ auth }: { readonly auth: AccountAuth }) {
  const { t } = useI18n();
  const sessions = useAccountSessionsQuery(auth);
  const currentEmail = sessions.data?.email ?? null;
  const [newEmail, setNewEmail] = useState("");
  const [failure, setFailure] = useState<EmailFailure | null>(null);
  const change = useMutation({
    mutationFn: async (email: string) => {
      const result = await auth.changeEmail({ newEmail: email, callbackURL: "/player/profile" });
      if (result.error) {
        throw new Error(result.error.code === "CHANGE_EMAIL_DISABLED" ? "unavailable" : "failed");
      }
      return email;
    },
    onError: (error) => setFailure(error.message === "unavailable" ? "unavailable" : "failed"),
    onSuccess: () => setNewEmail(""),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    change.reset();
    const problem = emailChangeProblem({ currentEmail: currentEmail ?? "", newEmail });
    setFailure(problem);
    if (!problem) change.mutate(newEmail.trim().toLowerCase());
  }
  const describedBy = failure ? "settings-email-error" : "settings-email-hint";
  return (
    <form
      aria-labelledby="settings-email-title"
      noValidate
      onSubmit={submit}
      {...applyStyles(styles.section)}
    >
      <SectionTitle id="settings-email-title">{t("settings.email")}</SectionTitle>
      {currentEmail ? (
        <Caption>{t("settings.emailCurrent", { email: currentEmail })}</Caption>
      ) : null}
      <Field invalid={failure !== null}>
        <FieldLabel htmlFor="settings-new-email">{t("settings.emailNew")}</FieldLabel>
        <Input
          aria-describedby={describedBy}
          aria-invalid={failure !== null}
          autoComplete="email"
          disabled={change.isPending}
          id="settings-new-email"
          inputMode="email"
          onChange={(event) => {
            setNewEmail(event.target.value);
            setFailure(null);
          }}
          type="email"
          value={newEmail}
        />
        <Caption id="settings-email-hint">{t("settings.emailHint")}</Caption>
      </Field>
      {failure ? (
        <Alert id="settings-email-error" role="alert" variant="destructive">
          <AlertDescription>{t(EMAIL_FAILURE_COPY[failure])}</AlertDescription>
        </Alert>
      ) : null}
      {change.isSuccess ? (
        <p role="status">
          <Caption>{t("settings.emailSent", { email: change.data })}</Caption>
        </p>
      ) : null}
      <div {...applyStyles(styles.actions)}>
        <Button
          aria-busy={change.isPending}
          disabled={change.isPending || !newEmail.trim()}
          type="submit"
          variant="outline"
        >
          {t(change.isPending ? "settings.emailSending" : "settings.emailSubmit")}
        </Button>
      </div>
    </form>
  );
}

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function PasswordForm({ auth }: { readonly auth: AccountAuth }) {
  const { t } = useI18n();
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [invalid, setInvalid] = useState(false);
  const change = useMutation({
    mutationFn: async () => {
      const result = await auth.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.code ?? "auth.change_password_failed");
    },
    onSuccess: () => setPasswords(EMPTY_PASSWORDS),
  });
  const failed = invalid || change.isError;
  function submit(event: FormEvent) {
    event.preventDefault();
    change.reset();
    const problem = passwordChangeProblem(passwords);
    setInvalid(problem !== null);
    if (!problem) change.mutate();
  }
  return (
    <form
      aria-labelledby="settings-password-title"
      noValidate
      onSubmit={submit}
      {...applyStyles(styles.section)}
    >
      <SectionTitle id="settings-password-title">{t("settings.password")}</SectionTitle>
      <Caption id="settings-password-hint">{t("settings.passwordHint")}</Caption>
      {(["current", "next", "confirm"] as const).map((key) => (
        <Field key={key} invalid={failed}>
          <FieldLabel htmlFor={`settings-${key}`}>
            {t(
              key === "current"
                ? "settings.currentPassword"
                : key === "next"
                  ? "settings.newPassword"
                  : "settings.confirmPassword",
            )}
          </FieldLabel>
          <Input
            aria-describedby={failed ? "settings-password-error" : "settings-password-hint"}
            aria-invalid={failed}
            autoComplete={key === "current" ? "current-password" : "new-password"}
            disabled={change.isPending}
            id={`settings-${key}`}
            maxLength={PASSWORD_MAX_LENGTH}
            onChange={(event) => {
              setPasswords({ ...passwords, [key]: event.target.value });
              setInvalid(false);
              change.reset();
            }}
            type="password"
            value={passwords[key]}
          />
        </Field>
      ))}
      {failed ? (
        <Alert id="settings-password-error" role="alert" variant="destructive">
          <AlertDescription>
            {t(invalid ? "settings.passwordInvalid" : "settings.passwordError")}
          </AlertDescription>
        </Alert>
      ) : null}
      {change.isSuccess ? (
        <p role="status">
          <Caption>{t("settings.passwordChanged")}</Caption>
        </p>
      ) : null}
      <div {...applyStyles(styles.actions)}>
        <Button
          aria-busy={change.isPending}
          disabled={change.isPending || !Object.values(passwords).some(Boolean)}
          type="submit"
          variant="outline"
        >
          {t(change.isPending ? "settings.passwordChanging" : "settings.passwordSubmit")}
        </Button>
      </div>
    </form>
  );
}
