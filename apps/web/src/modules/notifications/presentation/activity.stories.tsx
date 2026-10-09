import { useMemo, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  ACTIVITY_STORY_NOW,
  manyActivities,
  organizationActivityFixture,
  personalPendingFixture,
} from "./activity.fixtures.ts";
import {
  OrganizationActivityPageView,
  type OrganizationActivityPageState,
} from "./organization-activity-page.tsx";
import {
  OrganizationRecentActivityView,
  type OrganizationRecentActivityState,
} from "./organization-recent-activity.tsx";
import { PendingQueueView, type PendingQueueState } from "./shell-pending-queue.tsx";

const styles = stylex.create({
  page: { width: "min(56rem, 92vw)", backgroundColor: colors.background, padding: "1.5rem" },
  card: { width: "min(40rem, 92vw)" },
  sidebar: {
    width: "16rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.sidebar,
    padding: "0.5rem",
  },
});

function Harness({ children }: { readonly children: ReactNode }) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: () => children });
    return createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
  }, [children]);
  return (
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

const noop = () => undefined;

function RecentActivity({ state }: { readonly state: OrganizationRecentActivityState }) {
  return (
    <Harness>
      <div {...applyProps(undefined, undefined, styles.card)}>
        <OrganizationRecentActivityView
          now={ACTIVITY_STORY_NOW}
          organizationId="org-1"
          state={state}
        />
      </div>
    </Harness>
  );
}

function FeedPage({ state }: { readonly state: OrganizationActivityPageState }) {
  return (
    <Harness>
      <div {...applyProps(undefined, undefined, styles.page)}>
        <OrganizationActivityPageView now={ACTIVITY_STORY_NOW} state={state} />
      </div>
    </Harness>
  );
}

function Queue({ state }: { readonly state: PendingQueueState }) {
  return (
    <Harness>
      <div {...applyProps(undefined, undefined, styles.sidebar)}>
        <PendingQueueView now={ACTIVITY_STORY_NOW} state={state} />
      </div>
    </Harness>
  );
}

const meta = {
  title: "Product/Notifications/Activity",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecentActivityAllKinds: Story = {
  name: "Recent activity / All kinds",
  parameters: { a11y: { test: "error" } },
  render: () => (
    <RecentActivity state={{ status: "success", activities: organizationActivityFixture }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Competición publicada")).toBeVisible();
    await expect(canvas.getByText("Resolver disputa")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver toda la actividad" })).toBeVisible();
  },
};

export const RecentActivityCapped: Story = {
  name: "Recent activity / Ten of many",
  render: () => <RecentActivity state={{ status: "success", activities: manyActivities(14) }} />,
  play: async ({ canvasElement }) => {
    const list = await within(canvasElement).findByRole("list", { name: "Actividad reciente" });
    await expect(within(list).getAllByRole("listitem")).toHaveLength(10);
  },
};

export const RecentActivityEmpty: Story = {
  name: "Recent activity / Empty",
  render: () => <RecentActivity state={{ status: "success", activities: [] }} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Todavía no hay actividad/)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Ver toda la actividad" })).toBeNull();
  },
};

export const RecentActivityLoading: Story = {
  name: "Recent activity / Loading",
  render: () => <RecentActivity state={{ status: "pending" }} />,
};

export const RecentActivityError: Story = {
  name: "Recent activity / Error",
  render: () => <RecentActivity state={{ status: "error", retry: noop }} />,
};

export const FeedWithMore: Story = {
  name: "Feed page / With more",
  parameters: { layout: "fullscreen" },
  render: () => (
    <FeedPage
      state={{
        status: "success",
        activities: organizationActivityFixture,
        hasMore: true,
        loadingMore: false,
        loadMore: noop,
      }}
    />
  ),
};

export const FeedLoadingMore: Story = {
  name: "Feed page / Loading more",
  parameters: { layout: "fullscreen" },
  render: () => (
    <FeedPage
      state={{
        status: "success",
        activities: organizationActivityFixture,
        hasMore: true,
        loadingMore: true,
        loadMore: noop,
      }}
    />
  ),
};

export const FeedEmpty: Story = {
  name: "Feed page / Empty",
  parameters: { layout: "fullscreen" },
  render: () => (
    <FeedPage
      state={{
        status: "success",
        activities: [],
        hasMore: false,
        loadingMore: false,
        loadMore: noop,
      }}
    />
  ),
};

export const FeedForbidden: Story = {
  name: "Feed page / Forbidden",
  parameters: { layout: "fullscreen" },
  render: () => <FeedPage state={{ status: "forbidden" }} />,
};

export const FeedLoading: Story = {
  name: "Feed page / Loading",
  parameters: { layout: "fullscreen" },
  render: () => <FeedPage state={{ status: "pending" }} />,
};

export const FeedError: Story = {
  name: "Feed page / Error",
  parameters: { layout: "fullscreen" },
  render: () => <FeedPage state={{ status: "error", retry: noop }} />,
};

export const PendingOrganization: Story = {
  name: "Sidebar pending / Organization",
  render: () => (
    <Queue
      state={{
        status: "success",
        activities: organizationActivityFixture.filter(
          (row) => row.status === "open" && row.requiresAction,
        ),
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Resolver disputa")).toBeVisible();
    await expect(canvas.queryByText("Competición publicada")).toBeNull();
  },
};

export const PendingPersonal: Story = {
  name: "Sidebar pending / Personal",
  render: () => <Queue state={{ status: "success", activities: personalPendingFixture }} />,
};

export const PendingEmpty: Story = {
  name: "Sidebar pending / Empty",
  render: () => <Queue state={{ status: "success", activities: [] }} />,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("Nada por ahora")).toBeVisible();
  },
};

export const PendingLoading: Story = {
  name: "Sidebar pending / Loading",
  render: () => <Queue state={{ status: "pending" }} />,
};

export const PendingError: Story = {
  name: "Sidebar pending / Error",
  render: () => <Queue state={{ status: "error", retry: noop }} />,
};
