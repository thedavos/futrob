import { useState, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  hasBrowserWindow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { defaultAccountAuth, type AccountAuth } from "./account-auth.ts";
import { DeleteAccountSection } from "./account-delete-section.tsx";
import { PreferencesSection, SecuritySection } from "./account-sections.tsx";
import { SessionsSection } from "./account-sessions-section.tsx";
import { styles as accountStyles } from "./account.styles.ts";

export const ACCOUNT_SECTIONS = ["preferences", "security", "sessions", "delete"] as const;
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

const SECTION_LABELS = {
  preferences: "settings.section.preferences",
  security: "settings.section.security",
  sessions: "settings.section.sessions",
  delete: "settings.section.delete",
} as const satisfies Record<AccountSection, string>;

const WIDE_QUERY = "(min-width: 48rem)";

function subscribeWide(onChange: () => void) {
  if (!hasBrowserWindow()) return () => undefined;
  const list = window.matchMedia(WIDE_QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** Vertical navigation beside the panel on wide screens; horizontal tabs above it otherwise. */
function useWideLayout(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => (hasBrowserWindow() ? window.matchMedia(WIDE_QUERY).matches : true),
    () => true,
  );
}

const styles = stylex.create({
  dialog: {
    width: "min(48rem, calc(100vw - 2rem))",
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", [media.md]: "11rem minmax(0, 1fr)" },
    gap: { default: "1rem", [media.md]: "2rem" },
    alignItems: "start",
  },
  list: {
    flexDirection: { default: "row", [media.md]: "column" },
    alignItems: { default: "flex-end", [media.md]: "stretch" },
    gap: { default: "1.25rem", [media.md]: "0.25rem" },
    borderBottomWidth: { default: 1, [media.md]: 0 },
    minHeight: { default: "var(--control-height)", [media.md]: "auto" },
  },
  trigger: {
    justifyContent: { default: "center", [media.md]: "flex-start" },
    borderBottomWidth: { default: 2, [media.md]: 0 },
    borderRadius: { default: null, [media.md]: "var(--corner-md)" },
    paddingInline: { default: 0, [media.md]: "0.75rem" },
    backgroundColor: {
      default: "transparent",
      ":is([data-active])": { default: "transparent", [media.md]: colors.muted },
    },
    borderBottomColor: {
      default: "transparent",
      ":is([data-active])": { default: colors.primary, [media.md]: "transparent" },
    },
  },
  panel: { paddingTop: 0, minWidth: 0 },
});

export function SettingsDialog({
  open,
  onOpenChange,
  initialSection = "preferences",
  auth: authOverrides,
  returnFocus,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Where the dialog opens, e.g. `security` from the profile page. */
  readonly initialSection?: AccountSection;
  readonly auth?: Partial<AccountAuth>;
  readonly returnFocus?: RefObject<HTMLElement | null>;
}) {
  const { t } = useI18n();
  const auth = { ...defaultAccountAuth, ...authOverrides };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t("account.close")}
        finalFocus={returnFocus}
        {...applyStyles(accountStyles.dialog, styles.dialog)}
      >
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>
        {/* The popup unmounts on close, so every section starts clean when it opens again. */}
        <AccountSections auth={auth} initialSection={initialSection} />
        <DialogFooter {...applyStyles(accountStyles.footer)}>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {t("account.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountSections({
  auth,
  initialSection,
}: {
  readonly auth: AccountAuth;
  readonly initialSection: AccountSection;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState<AccountSection>(initialSection);
  const wide = useWideLayout();
  return (
    <Tabs
      onValueChange={(value: AccountSection) => {
        flushSync(() => setSection(value));
        // Arrow keys only move between sections; choosing one hands focus to its panel.
        document.getElementById(`account-panel-${value}`)?.focus();
      }}
      orientation={wide ? "vertical" : "horizontal"}
      value={section}
      className={styles.tabs}
    >
      <TabsList aria-label={t("settings.sections")} className={styles.list}>
        {ACCOUNT_SECTIONS.map((id) => (
          <TabsTrigger key={id} value={id} className={styles.trigger}>
            {t(SECTION_LABELS[id])}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* Every panel stays mounted: switching sections keeps what was typed. */}
      <TabsContent
        id="account-panel-preferences"
        keepMounted
        value="preferences"
        className={styles.panel}
      >
        <PreferencesSection />
      </TabsContent>
      <TabsContent
        id="account-panel-security"
        keepMounted
        value="security"
        className={styles.panel}
      >
        <SecuritySection auth={auth} />
      </TabsContent>
      <TabsContent
        id="account-panel-sessions"
        keepMounted
        value="sessions"
        className={styles.panel}
      >
        <SessionsSection auth={auth} active={section === "sessions"} />
      </TabsContent>
      <TabsContent id="account-panel-delete" keepMounted value="delete" className={styles.panel}>
        <DeleteAccountSection auth={auth} active={section === "delete"} />
      </TabsContent>
    </Tabs>
  );
}
