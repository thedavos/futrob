"use client";

import type { ComponentProps, ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Body,
  Caption,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  typography,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { CheckCircleIcon } from "@phosphor-icons/react";

import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

type Role = "organizers" | "captains" | "players";

interface RolePoint {
  readonly title: MessageKey;
  readonly description: MessageKey;
}

const ROLES: readonly Role[] = ["organizers", "captains", "players"];

const ROLE_POINTS = {
  organizers: [
    {
      title: "landing.roles.organizers.queue.title",
      description: "landing.roles.organizers.queue.description",
    },
    {
      title: "landing.roles.organizers.disputes.title",
      description: "landing.roles.organizers.disputes.description",
    },
    {
      title: "landing.roles.organizers.staff.title",
      description: "landing.roles.organizers.staff.description",
    },
    {
      title: "landing.roles.organizers.publish.title",
      description: "landing.roles.organizers.publish.description",
    },
  ],
  captains: [
    {
      title: "landing.roles.captains.select.title",
      description: "landing.roles.captains.select.description",
    },
    {
      title: "landing.roles.captains.confirm.title",
      description: "landing.roles.captains.confirm.description",
    },
    {
      title: "landing.roles.captains.reschedule.title",
      description: "landing.roles.captains.reschedule.description",
    },
  ],
  players: [
    {
      title: "landing.roles.players.profile.title",
      description: "landing.roles.players.profile.description",
    },
    { title: "landing.players.matches.title", description: "landing.players.matches.description" },
    { title: "landing.players.stats.title", description: "landing.players.stats.description" },
    { title: "landing.players.feats.title", description: "landing.players.feats.description" },
  ],
} as const satisfies Readonly<Record<Role, readonly RolePoint[]>>;

/** Fictional fixtures for the organizer's approval queue. */
const PENDING: readonly {
  readonly match: string;
  readonly status: MessageKey;
  readonly badge: BadgeVariant;
}[] = [
  {
    match: "Racing Centro 2–1 Atlético Norte",
    status: "landing.roles.organizers.example.confirmed",
    badge: "approved",
  },
  { match: "Sporting Lomas vs CD Estrella", status: "landing.status.selecting", badge: "warning" },
  {
    match: "Halcones vs Olímpico Sur",
    status: "landing.roles.organizers.example.disputed",
    badge: "destructive",
  },
];

const styles = stylex.create({
  panel: {
    display: "grid",
    alignItems: "start",
    gap: {
      default: space.s8,
      [media.lg]: space.s12,
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 5fr) minmax(0, 6fr)",
    },
  },
  points: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space.s5,
  },
  point: {
    display: "grid",
    gridTemplateColumns: "1.5rem minmax(0, 1fr)",
    columnGap: space.s3,
  },
  pointIcon: {
    marginTop: "0.125rem",
    color: colors.primary,
  },
  pointBody: {
    marginTop: space.s1,
    maxWidth: "52ch",
  },
  example: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: space.s4,
    padding: {
      default: space.s5,
      [media.sm]: space.s6,
    },
  },
  rows: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s2,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    paddingBlock: space.s3,
  },
  rowCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: space.s1,
  },
  status: {
    alignSelf: "flex-start",
  },
  sentence: {
    overflowWrap: "break-word",
    fontSize: {
      default: "var(--text-lg)",
      [media.sm]: "var(--text-xl)",
    },
    lineHeight: 1.45,
    fontWeight: 500,
  },
});

function RolePoints({ role }: { readonly role: Role }) {
  const { t } = useI18n();
  return (
    <ul {...applyStyles(styles.points)}>
      {ROLE_POINTS[role].map((point) => (
        <li key={point.title} {...applyStyles(styles.point)}>
          <CheckCircleIcon
            aria-hidden="true"
            size={24}
            weight="fill"
            {...applyStyles(styles.pointIcon)}
          />
          <div>
            <h3 {...applyStyles(typography.host, typography.title)}>{t(point.title)}</h3>
            <Body tone="muted" {...applyStyles(styles.pointBody)}>
              {t(point.description)}
            </Body>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExampleCard({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <Card aria-label={label} role="figure" {...applyStyles(styles.example)}>
      {children}
    </Card>
  );
}

function OrganizersExample() {
  const { t } = useI18n();
  return (
    <ExampleCard label={t("landing.roles.organizers.example.label")}>
      <h4 {...applyStyles(typography.host, typography.title)}>
        {t("landing.roles.organizers.example.title")}
      </h4>
      <ul {...applyStyles(styles.rows)}>
        {PENDING.map((row) => (
          <li key={row.match} {...applyStyles(styles.row)}>
            <Body as="span">{row.match}</Body>
            <Badge variant={row.badge}>{t(row.status)}</Badge>
          </li>
        ))}
      </ul>
    </ExampleCard>
  );
}

function CaptainsExample() {
  const { t } = useI18n();
  return (
    <ExampleCard label={t("landing.reschedule.panel.label")}>
      <Badge {...applyStyles(styles.status)} variant="warning">
        {t("landing.reschedule.panel.status")}
      </Badge>
      <p {...applyStyles(styles.sentence)}>{t("landing.reschedule.panel.sentence")}</p>
      <Body>{t("landing.reschedule.panel.respondBy")}</Body>
      <Caption as="p">{t("landing.reschedule.panel.options")}</Caption>
    </ExampleCard>
  );
}

function PlayersExample() {
  const { t } = useI18n();
  return (
    <ExampleCard label={t("landing.roles.players.example.label")}>
      <h4 {...applyStyles(typography.host, typography.title)}>
        {t("landing.roles.players.example.title")}
      </h4>
      <ul {...applyStyles(styles.rows)}>
        <li {...applyStyles(styles.row)}>
          <span {...applyStyles(styles.rowCopy)}>
            <Body as="span">Racing Centro 4–2 Halcones</Body>
            <Caption as="span">{t("landing.roles.players.example.first")}</Caption>
          </span>
          <Badge variant="emphasis">{t("landing.roles.players.example.hatTrick")}</Badge>
        </li>
        <li {...applyStyles(styles.row)}>
          <span {...applyStyles(styles.rowCopy)}>
            <Body as="span">Racing Centro 1–1 Atlético Norte</Body>
            <Caption as="span">{t("landing.roles.players.example.second")}</Caption>
          </span>
        </li>
      </ul>
    </ExampleCard>
  );
}

const EXAMPLES = {
  organizers: OrganizersExample,
  captains: CaptainsExample,
  players: PlayersExample,
} as const satisfies Readonly<Record<Role, () => ReactNode>>;

export function RolesSection() {
  const { t } = useI18n();
  return (
    <LandingSection
      id="roles"
      layout="stacked"
      subtitle={t("landing.roles.subtitle")}
      title={t("landing.roles.title")}
      tone="band"
    >
      <Tabs defaultValue="organizers" variant="pills">
        <TabsList>
          {ROLES.map((role) => (
            <TabsTrigger key={role} value={role}>
              {t(`landing.roles.tab.${role}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {ROLES.map((role) => {
          const Example = EXAMPLES[role];
          return (
            // Hidden panels stay in the DOM so every role's copy is crawlable.
            <TabsContent key={role} keepMounted value={role}>
              <div {...applyStyles(styles.panel)}>
                <RolePoints role={role} />
                <Example />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </LandingSection>
  );
}
