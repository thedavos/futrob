"use client";

import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlayerCompetitionsEmptySection } from "./player-competitions-empty-section.tsx";
import { useMyTeamsQuery } from "./player-queries.ts";

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
    gap: "2rem",
  },
  status: {
    color: colors.mutedForeground,
  },
  list: {
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  item: {
    display: "flex",
    minHeight: "var(--control-height)",
    alignItems: "center",
    gap: "1rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.25rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  meta: {
    color: colors.mutedForeground,
  },
});

type PlayerCompetitionRow = {
  readonly competitionId: string;
  readonly teamName: string;
  readonly organizationId: string;
};

export function PlayerCompetitionsPage() {
  const { t } = useI18n();
  const teamsQuery = useMyTeamsQuery();
  const competitions = competitionsFromTeams(teamsQuery.data?.teams ?? []);
  const showEmpty = !teamsQuery.isPending && competitions.length === 0;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("player.competitions.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("player.competitions.description")}</PageHeaderDescription>
        {showEmpty ? null : (
          <PageHeaderActions>
            <Button render={<Link to="/player/competitions/explore" />}>
              {t("player.home.cta.exploreCompetitions")}
            </Button>
          </PageHeaderActions>
        )}
      </PageHeader>

      <div {...applyStyles(styles.body)}>
        {teamsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("player.competitions.error")}</AlertDescription>
          </Alert>
        ) : null}

        {teamsQuery.isPending ? (
          <Caption {...applyStyles(styles.status)}>{t("player.competitions.loading")}</Caption>
        ) : showEmpty ? (
          <PlayerCompetitionsEmptySection />
        ) : (
          <ul {...applyStyles(styles.list)}>
            {competitions.map((competition) => (
              <li key={competition.competitionId} {...applyStyles(styles.item)}>
                <span {...applyStyles(styles.copy)}>
                  <span {...applyStyles(styles.name)}>Competición {competition.competitionId}</span>
                  <span {...applyStyles(typography.caption, styles.meta)}>
                    Equipo {competition.teamName}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function competitionsFromTeams(
  teams: readonly {
    readonly team: { readonly name: string; readonly organizationId: string };
    readonly membership: { readonly competitionId: string };
  }[],
): readonly PlayerCompetitionRow[] {
  const byId = new Map<string, PlayerCompetitionRow>();
  for (const item of teams) {
    const competitionId = item.membership.competitionId;
    if (byId.has(competitionId)) continue;
    byId.set(competitionId, {
      competitionId,
      teamName: item.team.name,
      organizationId: item.team.organizationId,
    });
  }
  return [...byId.values()];
}
