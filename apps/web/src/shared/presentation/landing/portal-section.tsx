"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Display,
  Subtitle,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

interface StandingRow {
  readonly team: string;
  readonly played: number;
  readonly goalDifference: number;
  readonly points: number;
}

const STANDINGS: readonly StandingRow[] = [
  { team: "Real Cuervos", played: 4, goalDifference: 6, points: 12 },
  { team: "Unión Barrio", played: 3, goalDifference: 3, points: 7 },
  { team: "FC Titanes", played: 3, goalDifference: 2, points: 6 },
  { team: "Atlético Norte", played: 4, goalDifference: -1, points: 4 },
  { team: "Sporting Lomas", played: 3, goalDifference: -1, points: 3 },
];

const POINT_KEYS = ["teams", "results", "rankings"] as const;

const styles = stylex.create({
  inner: {
    marginInline: "auto",
    display: "grid",
    maxWidth: "80rem",
    scrollMarginTop: "2rem",
    alignItems: "center",
    gap: {
      default: "3rem",
      [media.lg]: "4rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 5fr) minmax(0, 6fr)",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "8rem",
    },
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  subtitle: {
    maxWidth: "40ch",
    color: colors.mutedForeground,
    fontSize: {
      default: null,
      [media.sm]: "var(--text-base)",
    },
    lineHeight: {
      default: null,
      [media.sm]: "1.5rem",
    },
  },
  points: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  point: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingBlock: "0.75rem",
    fontWeight: 500,
  },
  table: {
    minWidth: 0,
  },
  numeric: {
    textAlign: "right",
  },
  team: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  pointsValue: {
    fontWeight: 700,
  },
  abbr: {
    textDecorationLine: "none",
  },
});

function formatGoalDifference(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export function PortalSection() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  const numeric = applyStyles(styles.numeric);
  const strongNumeric = applyStyles(styles.numeric, styles.pointsValue);
  const abbr = applyStyles(styles.abbr);
  return (
    <section id="portal">
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display as="h2">{t("landing.portal.title")}</Display>
          <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.portal.subtitle")}</Subtitle>
          <ul {...applyStyles(styles.points)}>
            {POINT_KEYS.map((key) => (
              <li key={key} {...applyStyles(styles.point)}>
                {t(`landing.portal.point.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div {...applyStyles(styles.table)}>
          <Table>
            <TableCaption>{t("landing.portal.table.caption")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead {...numeric}>
                  <abbr title={t("landing.portal.table.positionFull")} {...abbr}>
                    {t("landing.portal.table.position")}
                  </abbr>
                </TableHead>
                <TableHead>{t("landing.portal.table.team")}</TableHead>
                <TableHead {...numeric}>
                  <abbr title={t("landing.portal.table.playedFull")} {...abbr}>
                    {t("landing.portal.table.played")}
                  </abbr>
                </TableHead>
                <TableHead {...numeric}>
                  <abbr title={t("landing.portal.table.goalDifferenceFull")} {...abbr}>
                    {t("landing.portal.table.goalDifference")}
                  </abbr>
                </TableHead>
                <TableHead {...numeric}>
                  <abbr title={t("landing.portal.table.pointsFull")} {...abbr}>
                    {t("landing.portal.table.points")}
                  </abbr>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STANDINGS.map((row, index) => (
                <TableRow key={row.team}>
                  <TableCell {...numeric}>{index + 1}</TableCell>
                  <TableCell>
                    <span {...applyStyles(styles.team)}>
                      <ClubCrestAvatar
                        className={crest.className}
                        imageUrl={null}
                        name={row.team}
                        style={crest.style}
                      />
                      {row.team}
                    </span>
                  </TableCell>
                  <TableCell {...numeric}>{row.played}</TableCell>
                  <TableCell {...numeric}>{formatGoalDifference(row.goalDifference)}</TableCell>
                  <TableCell {...strongNumeric}>{row.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
