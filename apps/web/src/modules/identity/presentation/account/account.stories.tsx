import { useState, type ComponentProps, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, within } from "storybook/test";
import { Button, applyStyles } from "@futrob/ui";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LiveStatusRegion } from "@/shared/presentation/live-status-region.tsx";
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

const PROFILE_STORY_STATE = {
  profile: readyPlayerProfileFixture(),
  teams: { teams: [], activeRosterMembershipId: null },
  rosterInvitations: { invitations: [] },
  addGameAccount: "success" as const,
  setActiveTeam: "success" as const,
  acceptRosterInvitation: "success" as const,
  respondToRosterInvitation: "success" as const,
};

const readyIdentity = {
  status: "ready" as const,
  user: { name: "Alex García", email: "alex@example.test" },
  save: async () => undefined,
};

const readyAccounts = {
  status: "ready" as const,
  items: readyPlayerProfileFixture().gameAccounts,
};

function ProfilePageExample({
  identity,
  accounts,
}: {
  identity: ComponentProps<typeof PlayerProfilePageView>["identity"];
  accounts: ComponentProps<typeof PlayerProfilePageView>["accounts"];
}) {
  return (
    <>
      <LiveStatusRegion />
      <PlayerStoryShell
        initialPath="/player/profile"
        routes={[
          {
            path: "/player/profile",
            component: () => <PlayerProfilePageView accounts={accounts} identity={identity} />,
          },
          { path: "/player/game-accounts", component: () => <p>Datos de juego</p> },
          { path: "/player/statistics", component: () => <p>Mis estadísticas</p> },
        ]}
        state={PROFILE_STORY_STATE}
      />
    </>
  );
}

async function expectProfileChrome(canvas: ReturnType<typeof within>) {
  await expect(canvas.findByRole("heading", { name: "Mi perfil" })).resolves.toBeVisible();
  await expect(canvas.findByRole("heading", { name: "Cuentas de juego" })).resolves.toBeVisible();
  await expect(canvas.getByRole("link", { name: "Gestionar datos de juego" })).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Ver mis estadísticas" })).toBeVisible();
}

async function expectLoadingAnnouncement(
  canvas: ReturnType<typeof within>,
  canvasElement: HTMLElement,
  busyCount: number,
) {
  const status = await canvas.findByRole("status", { name: "Cargando tu perfil…" });
  await expect(status.closest("[aria-busy='true']")).toBeNull();
  await expect(canvasElement.querySelectorAll("[aria-busy='true']")).toHaveLength(busyCount);
}

function expectNoHorizontalOverflow(canvasElement: HTMLElement) {
  const { documentElement } = canvasElement.ownerDocument;
  expect(documentElement.scrollWidth).toBeLessThanOrEqual(documentElement.clientWidth);
}

function expectViewportWidth(canvasElement: HTMLElement, width: number) {
  expect(canvasElement.ownerDocument.defaultView?.innerWidth).toBe(width);
}

const phone390 = {
  viewport: {
    options: {
      iphone12: {
        name: "iPhone 12",
        styles: { width: "390px", height: "844px" },
        type: "mobile",
      },
    },
  },
};

const phone320 = {
  viewport: {
    options: {
      iphone5: {
        name: "iPhone 5/SE",
        styles: { width: "320px", height: "568px" },
        type: "mobile",
      },
    },
  },
};

function expectSkeletonBones(canvasElement: HTMLElement) {
  const bones = canvasElement.querySelectorAll("[data-slot='skeleton']");
  expect(bones.length).toBeGreaterThan(0);
  for (const bone of bones) {
    expect(bone).toHaveAttribute("aria-hidden", "true");
  }
}

export const ProfilePage: Story = {
  name: "Profile",
  parameters: { layout: "fullscreen" },
  render: () => <ProfilePageExample accounts={readyAccounts} identity={readyIdentity} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectProfileChrome(canvas);
    await expect(canvas.findByLabelText("Nombre visible")).resolves.toHaveValue("Alex García");
    await expect(canvas.getByLabelText("Correo de la cuenta")).toHaveValue("alex@example.test");
    await expect(canvas.getByText("davos282")).toBeVisible();
    await expect(canvas.getByText("davos.pc")).toBeVisible();
    await expect(canvas.queryByRole("status", { name: "Cargando tu perfil…" })).toBeNull();
  },
};

export const ProfilePageMobile: Story = {
  name: "Profile · 390",
  parameters: { layout: "fullscreen", ...phone390 },
  globals: { viewport: { value: "iphone12", isRotated: false } },
  render: () => <ProfilePageExample accounts={readyAccounts} identity={readyIdentity} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expectViewportWidth(canvasElement, 390);
    await expectProfileChrome(canvas);
    await expect(canvas.findByLabelText("Nombre visible")).resolves.toBeVisible();
    await expect(canvas.getByText("davos282")).toBeVisible();
    expectNoHorizontalOverflow(canvasElement);
  },
};

export const Loading: Story = {
  name: "Cargando",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ProfilePageExample accounts={{ status: "pending" }} identity={{ status: "pending" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectProfileChrome(canvas);
    await expectLoadingAnnouncement(canvas, canvasElement, 2);
    expectSkeletonBones(canvasElement);
    await expect(canvas.queryByLabelText("Nombre visible")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Guardar perfil" })).toBeNull();
    await expect(canvas.queryByText("davos282")).toBeNull();
    await userEvent.tab();
    await expect(canvasElement.ownerDocument.activeElement).not.toHaveAttribute(
      "data-slot",
      "skeleton",
    );
  },
};

export const LoadingMobile: Story = {
  name: "Cargando · 390",
  parameters: { layout: "fullscreen", ...phone390 },
  globals: { viewport: { value: "iphone12", isRotated: false } },
  render: () => (
    <ProfilePageExample accounts={{ status: "pending" }} identity={{ status: "pending" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expectViewportWidth(canvasElement, 390);
    await expectProfileChrome(canvas);
    await expectLoadingAnnouncement(canvas, canvasElement, 2);
    expectSkeletonBones(canvasElement);
    expectNoHorizontalOverflow(canvasElement);
  },
};

export const LoadingNarrow: Story = {
  name: "Cargando · 320",
  parameters: { layout: "fullscreen", ...phone320 },
  globals: { viewport: { value: "iphone5", isRotated: false } },
  render: () => (
    <ProfilePageExample accounts={{ status: "pending" }} identity={{ status: "pending" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expectViewportWidth(canvasElement, 320);
    await expectProfileChrome(canvas);
    await expectLoadingAnnouncement(canvas, canvasElement, 2);
    expectSkeletonBones(canvasElement);
    expectNoHorizontalOverflow(canvasElement);
  },
};

export const IdentityLoading: Story = {
  name: "Identidad cargando, cuentas listas",
  parameters: { layout: "fullscreen" },
  render: () => <ProfilePageExample accounts={readyAccounts} identity={{ status: "pending" }} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectProfileChrome(canvas);
    await expectLoadingAnnouncement(canvas, canvasElement, 1);
    expectSkeletonBones(canvasElement);
    await expect(canvas.queryByLabelText("Nombre visible")).toBeNull();
    await expect(canvas.findByText("davos282")).resolves.toBeVisible();
    await expect(canvas.getByText("davos.pc")).toBeVisible();
  },
};

export const AccountsLoading: Story = {
  name: "Cuentas cargando, identidad lista",
  parameters: { layout: "fullscreen" },
  render: () => <ProfilePageExample accounts={{ status: "pending" }} identity={readyIdentity} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectProfileChrome(canvas);
    await expectLoadingAnnouncement(canvas, canvasElement, 1);
    expectSkeletonBones(canvasElement);
    await expect(canvas.findByLabelText("Nombre visible")).resolves.toHaveValue("Alex García");
    await expect(canvas.queryByText("davos282")).toBeNull();
  },
};
