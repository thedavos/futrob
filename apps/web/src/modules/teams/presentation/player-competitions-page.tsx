"use client";

import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
  typography,
  useExternalSync,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlayerCompetitionsEmptySection } from "./player-competitions-empty-section.tsx";
import { useMyTeamsQuery } from "./player-queries.ts";

const LIST_SKELETON_ROWS = [0, 1, 2];

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
  },
  itemLink: {
    color: "inherit",
    textDecoration: "none",
    backgroundColor: { default: null, ":hover": colors.muted },
    outlineColor: colors.ring,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    outlineOffset: -2,
  },
  row: {
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
    flexGrow: 1,
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
  line: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    minHeight: "1lh",
  },
  nameBone: {
    width: "12rem",
    maxWidth: "70%",
    height: "0.625rem",
  },
  metaBone: {
    width: "8rem",
    maxWidth: "50%",
    height: "0.5rem",
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
  const loading = teamsQuery.isPending;
  const loadingLabel = t("player.competitions.loading");
  const showEmpty = !loading && competitions.length === 0;

  return (
    <main {...applyStyles(styles.main)}>
      <LoadingStatusRegion message={loading ? loadingLabel : ""} />
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

      <div aria-busy={loading || undefined} {...applyStyles(styles.body)}>
        {teamsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("player.competitions.error")}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <PlayerCompetitionsListSkeleton />
        ) : showEmpty ? (
          <PlayerCompetitionsEmptySection />
        ) : (
          <ul {...applyStyles(styles.list)}>
            {competitions.map((competition) => (
              <li key={competition.competitionId} {...applyStyles(styles.row)}>
                <Link
                  params={{
                    orgId: competition.organizationId,
                    competitionId: competition.competitionId,
                  }}
                  to="/orgs/$orgId/competitions/$competitionId/matches"
                  {...applyStyles(styles.item, styles.itemLink)}
                >
                  <span {...applyStyles(styles.copy)}>
                    <span {...applyStyles(typography.body, styles.name)}>
                      Competición {competition.competitionId}
                    </span>
                    <span {...applyStyles(typography.caption, styles.meta)}>
                      Equipo {competition.teamName}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

/** Keeps an empty polite live region mounted through a paint before writing the loading copy. */
function LoadingStatusRegion({ message }: { readonly message: string }) {
  const statusRef = useRef<HTMLSpanElement>(null);

  useExternalSync(() => {
    const node = statusRef.current;
    if (node == null) return;
    if (message === "") {
      node.textContent = "";
      return;
    }
    let innerFrameId: number | null = null;
    const outerFrameId = requestAnimationFrame(() => {
      innerFrameId = requestAnimationFrame(() => {
        node.textContent = message;
      });
    });
    return () => {
      cancelAnimationFrame(outerFrameId);
      if (innerFrameId !== null) {
        cancelAnimationFrame(innerFrameId);
      }
      node.textContent = "";
    };
  }, [message]);

  return (
    <span
      ref={statusRef}
      aria-atomic="true"
      aria-live="polite"
      role="status"
      {...applyStyles(vis.srOnly)}
    />
  );
}

function PlayerCompetitionsListSkeleton() {
  return (
    <ul aria-hidden="true" {...applyStyles(styles.list)}>
      {LIST_SKELETON_ROWS.map((index) => (
        <li key={index} {...applyStyles(styles.row)}>
          <div {...applyStyles(styles.item)}>
            <span {...applyStyles(styles.copy)}>
              <span {...applyStyles(typography.body, styles.line)}>
                <Skeleton {...applyStyles(styles.nameBone)} />
              </span>
              <span {...applyStyles(typography.caption, styles.line)}>
                <Skeleton {...applyStyles(styles.metaBone)} />
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
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
