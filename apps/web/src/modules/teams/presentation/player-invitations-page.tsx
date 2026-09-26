"use client";

import { useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Card,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  TextLink,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClockCounterClockwiseIcon, EnvelopeOpenIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { InvitationDetailCard } from "./invitation-detail-card.tsx";
import {
  filterInvitations,
  toInvitationViewItem,
  type InvitationInboxViewItem,
} from "./invitation-inbox-model.ts";
import { InvitationListCard } from "./invitation-list-card.tsx";
import {
  useMyRosterInvitationsQuery,
  useRespondToRosterInvitationMutation,
} from "./player-queries.ts";

const INVITATIONS_TAB = {
  pending: "pending",
  history: "history",
} as const;

type InvitationsTab = (typeof INVITATIONS_TAB)[keyof typeof INVITATIONS_TAB];

const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
  },
  body: {
    marginTop: "1rem",
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "1.5rem",
  },
  panel: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
    gap: "1.5rem",
    alignItems: "stretch",
  },
  tabs: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
  },
  tabPanel: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
  },
  skeletonCard: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.5rem",
  },
  skeletonRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "0.75rem",
  },
  skeletonCrest: {
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "var(--corner-full)",
  },
  skeletonLines: {
    display: "grid",
    gap: "0.5rem",
  },
  skeletonSearch: {
    height: "var(--control-height)",
  },
  skeletonLineWide: {
    height: "0.875rem",
    maxWidth: "70%",
  },
  skeletonLineNarrow: {
    height: "0.75rem",
    maxWidth: "45%",
  },
  skeletonBadge: {
    height: "1.5rem",
    width: "4.5rem",
    borderRadius: "var(--corner-full)",
  },
  skeletonBanner: {
    height: "5rem",
  },
  skeletonFacts: {
    height: "6rem",
  },
  skeletonActions: {
    display: "flex",
    gap: "0.75rem",
  },
  skeletonButton: {
    height: "var(--control-height)",
    width: "10rem",
  },
});

export function PlayerInvitationsPage() {
  const { t } = useI18n();
  const invitationsQuery = useMyRosterInvitationsQuery();
  const [tab, setTab] = useState<InvitationsTab>(INVITATIONS_TAB.pending);

  const items = useMemo(() => {
    const now = new Date();
    return (invitationsQuery.data?.invitations ?? []).map((dto) => toInvitationViewItem(dto, now));
  }, [invitationsQuery.data]);

  const pending = items.filter((item) => item.displayStatus === "pending");
  const history = items.filter((item) => item.displayStatus !== "pending");
  const showTabs = history.length > 0;
  const hideHeaderRedeem =
    invitationsQuery.isSuccess && pending.length === 0 && tab === INVITATIONS_TAB.pending;
  const tabs = applyStyles(styles.tabs);
  const tabPanel = applyStyles(styles.tabPanel);

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("player.invitations.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("player.invitations.description")}</PageHeaderDescription>
        {hideHeaderRedeem ? null : (
          <PageHeaderActions>
            <TextLink render={<Link to="/invitations/accept" />} text="label">
              {t("player.invitations.redeem")}
            </TextLink>
          </PageHeaderActions>
        )}
      </PageHeader>

      <div {...applyStyles(styles.body)}>
        {invitationsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("player.invitations.error")}</AlertDescription>
          </Alert>
        ) : invitationsQuery.isPending ? (
          <InvitationsSkeleton />
        ) : showTabs ? (
          <Tabs
            className={tabs.className}
            onValueChange={(value) => {
              if (value === INVITATIONS_TAB.pending || value === INVITATIONS_TAB.history) {
                setTab(value);
              }
            }}
            style={tabs.style}
            value={tab}
          >
            <TabsList>
              <TabsTrigger value={INVITATIONS_TAB.pending}>
                {t("player.home.invitations.pendingTitle")}
              </TabsTrigger>
              <TabsTrigger value={INVITATIONS_TAB.history}>
                {t("player.invitations.tab.history")}
              </TabsTrigger>
              <TabsIndicator />
            </TabsList>
            <TabsContent value={INVITATIONS_TAB.pending}>
              <div {...tabPanel}>
                <PendingPanel
                  items={pending}
                  onSeeHistory={() => setTab(INVITATIONS_TAB.history)}
                  showHistoryCta
                />
              </div>
            </TabsContent>
            <TabsContent value={INVITATIONS_TAB.history}>
              <div {...tabPanel}>
                <HistoryPanel items={history} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <PendingPanel items={pending} onSeeHistory={null} showHistoryCta={false} />
        )}
      </div>
    </main>
  );
}

function PendingPanel({
  items,
  showHistoryCta,
  onSeeHistory,
}: Readonly<{
  items: readonly InvitationInboxViewItem[];
  showHistoryCta: boolean;
  onSeeHistory: (() => void) | null;
}>) {
  const { t } = useI18n();
  const titleId = useId();
  if (items.length === 0) {
    return (
      <EmptyState aria-labelledby={titleId} fill>
        <EmptyStateIcon>
          <EnvelopeOpenIcon />
        </EmptyStateIcon>
        <EmptyStateCopy>
          <EmptyStateTitle id={titleId}>{t("player.invitations.empty.title")}</EmptyStateTitle>
          <EmptyStateDescription>{t("player.invitations.empty.subtitle")}</EmptyStateDescription>
        </EmptyStateCopy>
        <EmptyStateActions>
          <Button render={<Link to="/invitations/accept" />}>
            {t("player.invitations.redeem")}
          </Button>
          {showHistoryCta && onSeeHistory ? (
            <Button onClick={onSeeHistory} variant="outline">
              {t("player.home.cta.viewHistory")}
            </Button>
          ) : null}
        </EmptyStateActions>
        <EmptyStateFooter>{t("player.invitations.empty.footer")}</EmptyStateFooter>
      </EmptyState>
    );
  }
  return <InvitationInboxPanel items={items} showActions />;
}

/** Exported for Storybook: with tabs hidden sin historial, el vacío no es alcanzable en producto. */
export function HistoryPanel({ items }: Readonly<{ items: readonly InvitationInboxViewItem[] }>) {
  const { t } = useI18n();
  const titleId = useId();
  if (items.length === 0) {
    return (
      <EmptyState aria-labelledby={titleId} fill>
        <EmptyStateIcon>
          <ClockCounterClockwiseIcon />
        </EmptyStateIcon>
        <EmptyStateCopy>
          <EmptyStateTitle id={titleId}>
            {t("player.invitations.history.empty.title")}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {t("player.invitations.history.empty.subtitle")}
          </EmptyStateDescription>
        </EmptyStateCopy>
      </EmptyState>
    );
  }
  return <InvitationInboxPanel items={items} showActions={false} />;
}

function InvitationInboxPanel({
  items,
  showActions,
}: Readonly<{
  items: readonly InvitationInboxViewItem[];
  showActions: boolean;
}>) {
  const respondMutation = useRespondToRosterInvitationMutation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = filterInvitations(items, search);
  const selected = filtered.find((item) => item.invitationId === selectedId) ?? filtered[0] ?? null;

  return (
    <div {...applyStyles(styles.panel)}>
      <InvitationListCard
        items={filtered}
        onSearchChange={setSearch}
        onSelect={setSelectedId}
        search={search}
        selectedId={selected?.invitationId ?? null}
      />
      {selected ? (
        <InvitationDetailCard
          busy={respondMutation.isPending}
          item={selected}
          onAccept={(invitationId) => respondMutation.mutate({ invitationId, action: "accept" })}
          onDecline={(invitationId) => respondMutation.mutate({ invitationId, action: "decline" })}
          respondFailed={respondMutation.isError}
          showActions={showActions}
        />
      ) : null}
    </div>
  );
}

function InvitationsSkeleton() {
  return (
    <div {...applyStyles(styles.panel)}>
      <Card {...applyStyles(styles.skeletonCard)}>
        <Skeleton {...applyStyles(styles.skeletonSearch)} />
        {[0, 1, 2].map((row) => (
          <div key={row} {...applyStyles(styles.skeletonRow)}>
            <Skeleton {...applyStyles(styles.skeletonCrest)} />
            <div {...applyStyles(styles.skeletonLines)}>
              <Skeleton {...applyStyles(styles.skeletonLineWide)} />
              <Skeleton {...applyStyles(styles.skeletonLineNarrow)} />
            </div>
            <Skeleton {...applyStyles(styles.skeletonBadge)} />
          </div>
        ))}
      </Card>
      <Card {...applyStyles(styles.skeletonCard)}>
        <Skeleton {...applyStyles(styles.skeletonBanner)} />
        <Skeleton {...applyStyles(styles.skeletonFacts)} />
        <div {...applyStyles(styles.skeletonActions)}>
          <Skeleton {...applyStyles(styles.skeletonButton)} />
          <Skeleton {...applyStyles(styles.skeletonButton)} />
        </div>
      </Card>
    </div>
  );
}
