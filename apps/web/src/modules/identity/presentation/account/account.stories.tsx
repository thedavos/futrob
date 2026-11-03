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
import { styles } from "./account.styles.ts";

function Frame({ children, locale = "es" }: { children: ReactNode; locale?: Locale }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
  );
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

function SettingsExample({ locale = "es" }: { locale?: Locale }) {
  const [open, setOpen] = useState(true);
  return (
    <Frame locale={locale}>
      <Button onClick={() => setOpen(true)}>Settings</Button>
      {open ? (
        <SettingsDialog
          changePassword={async () => ({ error: new Error("Story password rejected") })}
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
