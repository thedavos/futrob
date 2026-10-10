"use client";

import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { CaretRightIcon, DotsThreeIcon, TrophyIcon } from "@phosphor-icons/react";
import type { CompetitionCoverDto, CompetitionDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextLink,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import {
  competitionFormatLabel,
  competitionListBadgeVariant,
} from "@/modules/competitions/presentation/competition-labels.ts";
import { competitionCoverSrc } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import { listCompetitionParticipants } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  formatCompetitionStart,
  organizationCompetitionHref,
  organizationCompetitionStatusLabel,
} from "./organization-home-copy.ts";

const styles = stylex.create({
  card: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1.25rem",
  },
  title: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    flexShrink: 0,
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
  },
  content: {
    padding: 0,
  },
  tableFrame: {
    borderWidth: 0,
    borderRadius: 0,
  },
  bodyCell: {
    height: "auto",
    paddingBlock: "1rem",
  },
  alignCenter: {
    textAlign: "center",
  },
  identity: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    gap: "0.75rem",
  },
  cover: {
    display: "block",
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
    objectFit: "contain",
  },
  trophy: {
    flexShrink: 0,
    color: colors.primary,
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.125rem",
  },
  nameLink: {
    display: "block",
    maxWidth: "100%",
    overflow: "hidden",
    color: colors.foreground,
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
  subtitle: {
    overflow: "hidden",
    color: colors.mutedForeground,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  dot: {
    width: "0.375rem",
    height: "0.375rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
    backgroundColor: "currentColor",
  },
  missing: {
    color: colors.mutedForeground,
  },
  countSkeleton: {
    display: "inline-block",
    width: "1.5rem",
    height: "1rem",
  },
});

export function OrganizationHomeCompetitionsTable({
  competitions,
  organizationId,
}: {
  readonly competitions: readonly CompetitionDto[];
  readonly organizationId: string;
}) {
  const { locale, t } = useI18n();
  const titleId = useId();
  const numberFormat = new Intl.NumberFormat(locale);
  const bodyCell = applyStyles(styles.bodyCell);
  const actionsCell = applyStyles(styles.bodyCell, styles.alignCenter);
  const participantQueries = useQueries({
    queries: competitions.map((competition) => ({
      queryKey: queryKeys.competitions.participants(organizationId, competition.id),
      queryFn: () => listCompetitionParticipants(organizationId, competition.id),
    })),
  });

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <Heading className={styles.title} id={titleId}>
          {t("org.home.competitions")}
        </Heading>
        <TextLink
          className={styles.action}
          render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions" />}
          text="caption"
        >
          {t("org.home.competitions.viewAll")}
          <CaretRightIcon aria-hidden {...applyStyles(styles.chevron)} />
        </TextLink>
      </CardHeader>
      <CardContent className={styles.content}>
        <Table containerClassName={styles.tableFrame} containerLabelledBy={titleId}>
          <TableHeader style={{ backgroundColor: "transparent" }}>
            <TableRow>
              <TableHead>{t("org.home.table.name")}</TableHead>
              <TableHead>{t("org.home.table.status")}</TableHead>
              <TableHead>{t("org.home.table.teams")}</TableHead>
              <TableHead>{t("org.home.table.start")}</TableHead>
              <TableHead style={{ textAlign: "center" }}>{t("org.home.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitions.map((competition, index) => {
              const query = participantQueries[index];
              const approved =
                query?.isSuccess === true
                  ? query.data.participants.filter((entry) => entry.status === "approved").length
                  : null;
              const start = formatCompetitionStart(competition.schedule.startsOn, locale);
              const href = organizationCompetitionHref(
                competition.organizationId,
                competition.id,
                competition.status,
              );
              const teamLabel =
                approved === null || approved === 0 ? null : numberFormat.format(approved);
              return (
                <TableRow key={competition.id}>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <div {...applyStyles(styles.identity)}>
                      <CompetitionCover cover={competition.cover} />
                      <span {...applyStyles(styles.copy)}>
                        <Link params={href.params} to={href.to} {...applyStyles(styles.nameLink)}>
                          {competition.name}
                        </Link>
                        <Caption {...applyStyles(styles.subtitle)}>
                          {`${competitionFormatLabel(competition.format, t)} · ${competition.gameEdition}`}
                        </Caption>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <Badge
                      className={styles.badge}
                      variant={competitionListBadgeVariant(competition.status)}
                    >
                      <span aria-hidden {...applyStyles(styles.dot)} />
                      {organizationCompetitionStatusLabel(competition.status, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    {query?.isPending ? (
                      <Skeleton {...applyStyles(styles.countSkeleton)} />
                    ) : (
                      <span {...applyStyles(teamLabel === null && styles.missing)}>
                        {teamLabel ?? "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <span {...applyStyles(start === null && styles.missing)}>{start ?? "—"}</span>
                  </TableCell>
                  <TableCell
                    className={actionsCell.className}
                    style={{ ...actionsCell.style, textAlign: "center" }}
                  >
                    <CompetitionActions competition={competition} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CompetitionCover({ cover }: { readonly cover: CompetitionCoverDto }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <TrophyIcon aria-hidden size={20} {...applyStyles(styles.trophy)} />;
  }
  return (
    <img
      alt=""
      data-outline="none"
      onError={() => setFailed(true)}
      src={competitionCoverSrc(cover)}
      {...applyStyles(styles.cover)}
    />
  );
}

function CompetitionActions({ competition }: { readonly competition: CompetitionDto }) {
  const { t } = useI18n();
  const open = organizationCompetitionHref(
    competition.organizationId,
    competition.id,
    competition.status,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("org.home.actions.menu", { name: competition.name })}
            dense
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <DotsThreeIcon aria-hidden="true" size={20} weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link params={open.params} to={open.to} />}>
          {competition.status === "draft"
            ? t("org.home.actions.configure")
            : t("org.home.actions.open")}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <Link
              params={{ orgId: competition.organizationId, competitionId: competition.id }}
              to="/orgs/$orgId/competitions/$competitionId/teams"
            />
          }
        >
          {t("org.home.actions.teams")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
