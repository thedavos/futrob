import { useState, type RefObject } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  SectionTitle,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@futrob/ui";
import { sidebarLayoutSchema, type SidebarLayoutDto } from "@futrob/api-contracts";
import { authClient } from "@/modules/identity/auth-client.ts";
import {
  DEFAULT_SIDEBAR_LAYOUT,
  useActorPreferencesQuery,
  useSaveActorPreferencesMutation,
} from "@/modules/identity/presentation/identity-queries.ts";
import {
  useEmailPreferencesQuery,
  useSaveEmailPreferencesMutation,
} from "@/modules/notifications/presentation/email-queries.ts";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./account.styles.ts";

type SettingsError =
  | "settings.passwordInvalid"
  | "settings.passwordError"
  | "settings.languageError"
  | "settings.sidebarLayoutError"
  | "settings.emailError"
  | "settings.error";

const SIDEBAR_LAYOUT_LABELS = {
  navigation: "settings.sidebarLayoutNavigation",
  "pending-queue": "settings.sidebarLayoutPendingQueue",
} as const satisfies Record<SidebarLayoutDto, string>;

type EmailChoice = "all" | "critical";

const EMAIL_CHOICE_LABELS = {
  all: "settings.emailAll",
  critical: "settings.emailCritical",
} as const satisfies Record<EmailChoice, string>;

export function SettingsDialog({
  open,
  onOpenChange,
  changePassword = authClient.changePassword,
  returnFocus,
}: {
  readonly open: boolean;
  readonly returnFocus?: RefObject<HTMLElement | null>;
  readonly onOpenChange: (open: boolean) => void;
  readonly changePassword?: (input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: true;
  }) => Promise<{ error: unknown }>;
}) {
  const { t, locale, setLocale } = useI18n();
  const [language, setLanguage] = useState<Locale>(locale);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState<SettingsError | null>(null);
  const preferences = useActorPreferencesQuery();
  const saveActorPreferences = useSaveActorPreferencesMutation();
  const savedSidebarLayout = preferences.data?.sidebarLayout ?? DEFAULT_SIDEBAR_LAYOUT;
  // `null` follows the account's value, which may still be loading when the dialog opens.
  const [sidebarLayoutDraft, setSidebarLayoutDraft] = useState<SidebarLayoutDto | null>(null);
  const sidebarLayout = sidebarLayoutDraft ?? savedSidebarLayout;
  const changingSidebarLayout = sidebarLayout !== savedSidebarLayout;
  const emailPreferences = useEmailPreferencesQuery();
  const saveEmailPreferences = useSaveEmailPreferencesMutation();
  const savedEmail: EmailChoice | null = emailPreferences.data
    ? emailPreferences.data.nonCriticalEmail
      ? "all"
      : "critical"
    : null;
  const [emailDraft, setEmailDraft] = useState<EmailChoice | null>(null);
  const emailChoice = emailDraft ?? savedEmail;
  // Email goes out in the language chosen here, so a language change re-saves it too.
  const changingEmail =
    emailChoice !== null &&
    (emailChoice !== savedEmail || emailPreferences.data?.locale !== language);
  const changingPassword = Object.values(passwords).some(Boolean);
  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (changingPassword) {
        if (
          !passwords.current ||
          passwords.next.length < 8 ||
          passwords.next.length > 128 ||
          passwords.next !== passwords.confirm
        ) {
          setError("settings.passwordInvalid");
          return false;
        }
        try {
          const result = await changePassword({
            currentPassword: passwords.current,
            newPassword: passwords.next,
            revokeOtherSessions: true,
          });
          if (result.error) {
            setError("settings.passwordError");
            return false;
          }
        } catch {
          setError("settings.passwordError");
          return false;
        }
        setPasswords({ current: "", next: "", confirm: "" });
      }
      try {
        await setLocale(language);
      } catch {
        setError(changingPassword ? "settings.languageError" : "settings.error");
        return false;
      }
      if (changingSidebarLayout) {
        try {
          await saveActorPreferences.mutateAsync({ sidebarLayout });
        } catch {
          setError(
            changingPassword || language !== locale
              ? "settings.sidebarLayoutError"
              : "settings.error",
          );
          return false;
        }
      }
      if (changingEmail) {
        try {
          await saveEmailPreferences.mutateAsync({
            locale: language,
            nonCriticalEmail: emailChoice === "all",
          });
        } catch {
          setError(
            changingPassword || language !== locale || changingSidebarLayout
              ? "settings.emailError"
              : "settings.error",
          );
          return false;
        }
      }
      return true;
    },
  });
  const saved = mutation.isSuccess && mutation.data;
  function close() {
    if (mutation.isPending) return;
    setPasswords({ current: "", next: "", confirm: "" });
    setLanguage(locale);
    setSidebarLayoutDraft(null);
    setEmailDraft(null);
    setError(null);
    mutation.reset();
    onOpenChange(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        closeLabel={t("account.close")}
        finalFocus={returnFocus}
        {...applyStyles(styles.dialog)}
      >
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>
        <form
          {...applyStyles(styles.stack)}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <fieldset disabled={mutation.isPending} {...applyStyles(styles.stack)}>
            <Field>
              <FieldLabel htmlFor="settings-language">{t("settings.language")}</FieldLabel>
              <Select
                disabled={mutation.isPending}
                items={[
                  { value: "es", label: "Español" },
                  { value: "en", label: "English" },
                ]}
                onValueChange={(value) => {
                  setLanguage(value === "en" ? "en" : "es");
                  mutation.reset();
                  setError(null);
                }}
                value={language}
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
            <Field>
              <FieldLabel htmlFor="settings-sidebar-layout">
                {t("settings.sidebarLayout")}
              </FieldLabel>
              <Select
                disabled={mutation.isPending || preferences.isPending}
                items={sidebarLayoutSchema.options.map((value) => ({
                  value,
                  label: t(SIDEBAR_LAYOUT_LABELS[value]),
                }))}
                onValueChange={(value) => {
                  setSidebarLayoutDraft(sidebarLayoutSchema.parse(value));
                  mutation.reset();
                  setError(null);
                }}
                value={sidebarLayout}
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
            <Field>
              <FieldLabel htmlFor="settings-email">{t("settings.email")}</FieldLabel>
              <Select
                disabled={mutation.isPending || emailChoice === null}
                items={(["all", "critical"] as const).map((value) => ({
                  value,
                  label: t(EMAIL_CHOICE_LABELS[value]),
                }))}
                onValueChange={(value) => {
                  setEmailDraft(value === "critical" ? "critical" : "all");
                  mutation.reset();
                  setError(null);
                }}
                value={emailChoice}
              >
                <SelectTrigger aria-describedby="settings-email-hint" id="settings-email">
                  <SelectValue
                    placeholder={t(
                      emailPreferences.isError
                        ? "settings.emailUnavailable"
                        : "settings.emailLoading",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(["all", "critical"] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(EMAIL_CHOICE_LABELS[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Caption id="settings-email-hint">{t("settings.emailHint")}</Caption>
            </Field>
            <section {...applyStyles(styles.section)} aria-labelledby="settings-password-title">
              <SectionTitle id="settings-password-title">{t("settings.password")}</SectionTitle>
              <Caption id="settings-password-hint">{t("settings.passwordHint")}</Caption>
              {(["current", "next", "confirm"] as const).map((key) => (
                <Field
                  key={key}
                  invalid={
                    error === "settings.passwordInvalid" || error === "settings.passwordError"
                  }
                >
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
                    aria-describedby={
                      error === "settings.passwordInvalid" || error === "settings.passwordError"
                        ? "settings-error"
                        : "settings-password-hint"
                    }
                    aria-invalid={
                      error === "settings.passwordInvalid" || error === "settings.passwordError"
                    }
                    autoComplete={key === "current" ? "current-password" : "new-password"}
                    id={`settings-${key}`}
                    maxLength={128}
                    onChange={(event) => {
                      setPasswords({ ...passwords, [key]: event.target.value });
                      mutation.reset();
                      setError(null);
                    }}
                    type="password"
                    value={passwords[key]}
                  />
                </Field>
              ))}
            </section>
          </fieldset>
          {error ? (
            <Alert id="settings-error" role="alert" variant="destructive">
              <AlertDescription>{t(error)}</AlertDescription>
            </Alert>
          ) : null}
          {saved ? (
            <p role="status">
              <Caption>{t("settings.saved")}</Caption>
            </p>
          ) : null}
          <DialogFooter {...applyStyles(styles.footer)}>
            <Button disabled={mutation.isPending} onClick={close} type="button" variant="outline">
              {t("account.close")}
            </Button>
            <Button
              aria-busy={mutation.isPending}
              disabled={
                mutation.isPending ||
                (language === locale &&
                  !changingPassword &&
                  !changingSidebarLayout &&
                  !changingEmail)
              }
              type="submit"
            >
              {t(mutation.isPending ? "account.saving" : "settings.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
