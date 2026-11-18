"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Body, Caption, Card, type Icon, typography } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import {
  ArrowsClockwiseIcon,
  DeviceMobileIcon,
  GavelIcon,
  GlobeIcon,
  PlusIcon,
  TableIcon,
  TrophyIcon,
} from "@phosphor-icons/react";

import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

/** Fictional clubs; the landing never shows real crests (see `design.md`, Hero). */
const STANDINGS = [
  { team: "Racing Centro", played: 9, goalDifference: "+14", points: 22 },
  { team: "Atlético Norte", played: 9, goalDifference: "+9", points: 19 },
  { team: "Sporting Lomas", played: 9, goalDifference: "+4", points: 16 },
] as const;

const MORE_KEYS = [
  "landing.features.more.reschedule",
  "landing.features.more.disputes",
  "landing.features.more.rankings",
  "landing.features.more.notifications",
  "landing.features.more.staff",
] as const satisfies readonly MessageKey[];

const styles = stylex.create({
  grid: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: space.s4,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(6, minmax(0, 1fr))",
    },
  },
  tile: {
    display: "flex",
    height: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: space.s2,
    overflow: "hidden",
    padding: space.s6,
  },
  // From `md` the wide tiles take the full row; from `lg` the grid has six tracks.
  wide: {
    gridColumn: {
      default: null,
      [media.md]: "span 2",
      [media.lg]: "span 4",
    },
  },
  tall: {
    gridColumn: {
      default: null,
      [media.lg]: "span 2",
    },
    gridRow: {
      default: null,
      [media.lg]: "span 2",
    },
  },
  narrow: {
    gridColumn: {
      default: null,
      [media.lg]: "span 2",
    },
  },
  icon: {
    display: "grid",
    width: "2.25rem",
    height: "2.25rem",
    flexShrink: 0,
    placeItems: "center",
    marginBottom: space.s2,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.accent,
    color: colors.accentForeground,
  },
  description: {
    maxWidth: "52ch",
  },
  // Example content sits at the bottom of its tile, below the copy.
  example: {
    marginTop: "auto",
    paddingTop: space.s4,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontVariantNumeric: "tabular-nums",
  },
  th: {
    paddingBlock: space.s2,
    paddingInline: space.s2,
    textAlign: "end",
    fontWeight: 500,
    color: colors.textTertiary,
  },
  td: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    paddingBlock: space.s2,
    paddingInline: space.s2,
    textAlign: "end",
  },
  start: {
    textAlign: "start",
  },
  points: {
    fontWeight: 700,
  },
  team: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: space.s2,
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  phone: {
    marginInline: "auto",
    marginTop: space.s4,
    display: "flex",
    width: "100%",
    maxWidth: "13rem",
    flexDirection: "column",
    gap: space.s2,
    borderRadius: "1.75rem",
    borderWidth: 6,
    borderStyle: "solid",
    borderColor: colors.surfaceRaised,
    backgroundColor: colors.background,
    paddingBlock: space.s4,
    paddingInline: space.s3,
  },
  candidate: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s2,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: space.s2,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  candidateSelected: {
    outlineWidth: 2,
    outlineStyle: "solid",
    outlineColor: colors.primary,
    outlineOffset: -2,
  },
  // A picture of the button, not a control: the phone is decorative.
  fakeButton: {
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    padding: space.s2,
    textAlign: "center",
    fontWeight: 700,
  },
  log: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  logRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: space.s3,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    paddingBlock: space.s2,
  },
  chips: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: space.s2,
  },
});

function FeatureTile({
  children,
  description,
  icon: TileIcon,
  size,
  title,
}: {
  readonly children?: ReactNode;
  readonly description: string;
  readonly icon: Icon;
  readonly size: "wide" | "tall" | "narrow";
  readonly title: string;
}) {
  return (
    <li {...applyStyles(styles[size])}>
      <Card {...applyStyles(styles.tile)}>
        <span {...applyStyles(styles.icon)}>
          <TileIcon aria-hidden="true" size={20} />
        </span>
        <h3 {...applyStyles(typography.host, typography.title)}>{title}</h3>
        <Body tone="muted" {...applyStyles(styles.description)}>
          {description}
        </Body>
        {children}
      </Card>
    </li>
  );
}

export function FeaturesSection() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  return (
    <LandingSection
      id="funciones"
      layout="stacked"
      subtitle={t("landing.features.subtitle")}
      title={t("landing.features.title")}
      tone="band"
    >
      <ul {...applyStyles(styles.grid)}>
        <FeatureTile
          description={t("landing.features.table.description")}
          icon={TableIcon}
          size="wide"
          title={t("landing.features.table.title")}
        >
          <div aria-hidden="true" {...applyStyles(styles.example)}>
            <table {...applyStyles(typography.host, typography.caption, styles.table)}>
              <thead>
                <tr>
                  <th {...applyStyles(styles.th, styles.start)}>
                    {t("landing.features.table.club")}
                  </th>
                  <th {...applyStyles(styles.th)}>{t("landing.features.table.played")}</th>
                  <th {...applyStyles(styles.th)}>{t("landing.features.table.goalDifference")}</th>
                  <th {...applyStyles(styles.th)}>{t("landing.features.table.points")}</th>
                </tr>
              </thead>
              <tbody>
                {STANDINGS.map((row) => (
                  <tr key={row.team}>
                    <td {...applyStyles(styles.td, styles.start)}>
                      <span {...applyStyles(styles.team)}>
                        <ClubCrestAvatar
                          className={crest.className}
                          imageUrl={null}
                          name={row.team}
                          style={crest.style}
                        />
                        {row.team}
                      </span>
                    </td>
                    <td {...applyStyles(styles.td)}>{row.played}</td>
                    <td {...applyStyles(styles.td)}>{row.goalDifference}</td>
                    <td {...applyStyles(styles.td, styles.points)}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FeatureTile>

        <FeatureTile
          description={t("landing.features.captain.description")}
          icon={DeviceMobileIcon}
          size="tall"
          title={t("landing.features.captain.title")}
        >
          <div
            aria-hidden="true"
            {...applyStyles(typography.host, typography.caption, styles.phone)}
          >
            <span>{t("landing.features.captain.fixture")}</span>
            <span {...applyStyles(styles.candidate, styles.candidateSelected)}>
              RC 2–1 AN
              <Badge variant="warning">{t("landing.status.selecting")}</Badge>
            </span>
            <span {...applyStyles(styles.candidate)}>
              RC 0–0 AN
              <Badge variant="info">{t("landing.status.candidate")}</Badge>
            </span>
            <span {...applyStyles(styles.fakeButton)}>{t("landing.features.captain.confirm")}</span>
          </div>
        </FeatureTile>

        <FeatureTile
          description={t("landing.features.sync.description")}
          icon={ArrowsClockwiseIcon}
          size="narrow"
          title={t("landing.features.sync.title")}
        >
          <div aria-hidden="true" {...applyStyles(styles.example)}>
            <Badge variant="info">{t("landing.features.sync.lastRun")}</Badge>
          </div>
        </FeatureTile>

        <FeatureTile
          description={t("landing.features.cup.description")}
          icon={TrophyIcon}
          size="narrow"
          title={t("landing.features.cup.title")}
        >
          <div aria-hidden="true" {...applyStyles(styles.example)}>
            <Badge variant="approved">{t("landing.status.approved")}</Badge>
          </div>
        </FeatureTile>

        <FeatureTile
          description={t("landing.features.audit.description")}
          icon={GavelIcon}
          size="narrow"
          title={t("landing.features.audit.title")}
        >
          <ul aria-hidden="true" {...applyStyles(styles.example, styles.log)}>
            <li {...applyStyles(styles.logRow)}>
              <Caption as="span" tone="default">
                {t("landing.features.audit.sanction")}
              </Caption>
              <Caption as="span">{t("landing.features.audit.sanctionDate")}</Caption>
            </li>
            <li {...applyStyles(styles.logRow)}>
              <Caption as="span" tone="default">
                {t("landing.features.audit.approval")}
              </Caption>
              <Caption as="span">{t("landing.features.audit.approvalDate")}</Caption>
            </li>
          </ul>
        </FeatureTile>

        <FeatureTile
          description={t("landing.features.portal.description")}
          icon={GlobeIcon}
          size="narrow"
          title={t("landing.features.portal.title")}
        />

        <FeatureTile
          description={t("landing.features.more.description")}
          icon={PlusIcon}
          size="narrow"
          title={t("landing.features.more.title")}
        >
          <ul {...applyStyles(styles.example, styles.chips)}>
            {MORE_KEYS.map((key) => (
              <li key={key}>
                <Badge variant="outline">{t(key)}</Badge>
              </li>
            ))}
          </ul>
        </FeatureTile>
      </ul>
    </LandingSection>
  );
}
