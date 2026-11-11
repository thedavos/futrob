import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button, applyStyles } from "@futrob/ui";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { ProfileEditor } from "./profile-editor.tsx";
import { FeedbackDialog } from "./feedback-dialog.tsx";
import { SettingsDialog } from "./settings-dialog.tsx";
import { PlayerProfilePageView } from "./player-profile-page.tsx";
import { readyPlayerProfileFixture } from "@/modules/teams/presentation/player-story-fixtures.ts";
import { PlayerStoryShell } from "@/modules/teams/presentation/player-story-shell.tsx";
import type { AccountDeletionStatusDto } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import type { AccountAuth } from "./account-auth.ts";
import type { AccountSection } from "./settings-dialog.tsx";
import { styles } from "./account.styles.ts";

const READY_DELETION: AccountDeletionStatusDto = {
  deletion: { status: "active" },
  blockers: [],
};

const BLOCKED_DELETION: AccountDeletionStatusDto = {
  deletion: { status: "active" },
  blockers: [
    {
      kind: "sole-organizer",
      organizationId: "org-norte",
      organizationName: "Liga Norte",
    },
    {
      kind: "active-captain",
      competitionId: "comp-apertura",
      competitionName: "Apertura 2026",
      teamId: "team-halcones",
      teamName: "Halcones FC",
    },
  ],
};

/** Better Auth stand-in: this browser and a phone, so the sessions panel has both rows. */
const storyAuth: Partial<AccountAuth> = {
  getSession: async () => ({
    data: { session: { id: "s-this" }, user: { email: "alex@example.test" } },
    error: null,
  }),
  listSessions: async () => ({
    data: [
      {
        id: "s-this",
        token: "t-this",
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-09T10:00:00.000Z",
        expiresAt: "2026-12-01T10:00:00.000Z",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0 Safari/537.36",
      },
      {
        id: "s-phone",
        token: "t-phone",
        createdAt: "2026-11-02T10:00:00.000Z",
        updatedAt: "2026-11-08T10:00:00.000Z",
        expiresAt: "2026-12-02T10:00:00.000Z",
        userAgent: "okhttp/4.12.0",
      },
    ],
    error: null,
  }),
  revokeSession: async () => ({ error: null }),
  revokeOtherSessions: async () => ({ error: null }),
  changeEmail: async () => ({ error: null }),
  changePassword: async () => ({ error: { message: "Story password rejected" } }),
};

function Frame({
  children,
  locale = "es",
  deletion = READY_DELETION,
}: {
  children: ReactNode;
  locale?: Locale;
  deletion?: AccountDeletionStatusDto;
}) {
  const [client] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.identity.accountDeletion(), deletion);
    queryClient.setQueryData(queryKeys.identity.preferences(), { sidebarLayout: "navigation" });
    queryClient.setQueryData(queryKeys.notifications.emailPreferences(), {
      locale,
      nonCriticalEmail: true,
    });
    return queryClient;
  });
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>
        <div {...applyStyles(styles.page)}>{children}</div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function FeedbackExample({ locale = "es" }: { locale?: Locale }) {
  const [open, setOpen] = useState(true);
  return (
    <Frame locale={locale}>
      <Button onClick={() => setOpen(true)}>Feedback</Button>
      <FeedbackDialog onOpenChange={setOpen} open={open} pathname="/player/matches" />
    </Frame>
  );
}

function SettingsExample({
  locale = "es",
  deletion,
  initialSection,
}: {
  locale?: Locale;
  deletion?: AccountDeletionStatusDto;
  initialSection?: AccountSection;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Frame deletion={deletion} locale={locale}>
      <Button onClick={() => setOpen(true)}>Settings</Button>
      {open ? (
        <SettingsDialog
          auth={storyAuth}
          initialSection={initialSection}
          onOpenChange={setOpen}
          open
        />
      ) : null}
    </Frame>
  );
}

const meta = {
  title: "Product/Account",
  parameters: { layout: "padded" },
  render: () => (
    <Frame>
      <ProfileEditor
        identity={{ name: "Alex García", email: "alex@example.test" }}
        save={async () => undefined}
      />
    </Frame>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const SaveError: Story = {
  render: () => (
    <Frame>
      <ProfileEditor
        identity={{ name: "Alex García", email: "alex@example.test" }}
        save={async () => {
          throw new Error("Unavailable");
        }}
      />
    </Frame>
  ),
};
export const Feedback: Story = { render: () => <FeedbackExample /> };
export const FeedbackEnglish: Story = { render: () => <FeedbackExample locale="en" /> };
export const Settings: Story = { render: () => <SettingsExample /> };
export const SettingsEnglish: Story = { render: () => <SettingsExample locale="en" /> };
export const SettingsDeletionBlocked: Story = {
  render: () => <SettingsExample deletion={BLOCKED_DELETION} initialSection="delete" />,
};

export const ProfilePage: Story = {
  render: () => (
    <PlayerStoryShell
      initialPath="/player/profile"
      state={{
        profile: readyPlayerProfileFixture(),
        teams: { teams: [], activeRosterMembershipId: null },
        rosterInvitations: { invitations: [] },
        addGameAccount: "success",
        setActiveTeam: "success",
        acceptRosterInvitation: "success",
        respondToRosterInvitation: "success",
      }}
      routes={[
        {
          path: "/player/profile",
          component: () => (
            <PlayerProfilePageView
              identity={{
                status: "ready",
                user: { name: "Alex García", email: "alex@example.test" },
                save: async () => undefined,
              }}
              accounts={{ status: "ready", items: readyPlayerProfileFixture().gameAccounts }}
            />
          ),
        },
        { path: "/player/game-accounts", component: () => <p>Datos de juego</p> },
        { path: "/player/statistics", component: () => <p>Mis estadísticas</p> },
      ]}
    />
  ),
};
