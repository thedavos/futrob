import { useId } from "react";
import type {
  GetCompetitionRankingsResponse,
  RankingKindDto,
  RankingRowDto,
} from "@futrob/api-contracts";
import { rankingPer90, rankingPlayerStandings, type RankingPlayerStanding } from "@futrob/sdk";
import { UserFocusIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Caption,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Heading,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  typography,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  formatRankingValue,
  RANKING_KIND_COPY,
  rankingNamesOf,
  rankingPlayerName,
  type RankingFormatters,
  type RankingNamesState,
} from "./competition-rankings-view.ts";
import { styles } from "./competition-rankings-player-detail.styles.ts";
import type { RankingDetailHost } from "./competition-rankings-viewport.ts";

type DetailProps = {
  readonly data: GetCompetitionRankingsResponse;
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly names: RankingNamesState;
  readonly selectedId: string | null;
  readonly t: Translator;
};

/**
 * Cross-ranking detail of the selected player: beside the table on wide desktops, in a
 * dialog on tablets and in a bottom sheet on phones. Closing an overlay clears the
 * selection; the aside keeps it until another row is chosen.
 */
export function RankingPlayerDetail({
  host,
  onClose,
  ...props
}: DetailProps & {
  readonly host: RankingDetailHost;
  readonly onClose: () => void;
}) {
  const player = selectedPlayer(props);
  switch (host) {
    case "aside":
      return <DetailAside {...props} player={player} />;
    case "dialog":
      return (
        <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open={player !== null}>
          {player ? (
            <DialogContent
              className={styles.dialog}
              closeLabel={props.t("competition.rankings.detail.close")}
            >
              <DialogHeader>
                <DialogTitle>{player.name}</DialogTitle>
                <DialogDescription>{player.team}</DialogDescription>
              </DialogHeader>
              <div {...applyStyles(styles.dialogBody)}>
                <DetailBody {...props} player={player} />
              </div>
            </DialogContent>
          ) : null}
        </Dialog>
      );
    case "sheet":
      return (
        <Sheet onOpenChange={(open) => (open ? undefined : onClose())} open={player !== null}>
          {player ? (
            <SheetContent
              className={styles.sheet}
              closeLabel={props.t("competition.rankings.detail.close")}
              side="bottom"
            >
              <SheetHeader>
                <SheetTitle>{player.name}</SheetTitle>
                <SheetDescription>{player.team}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <DetailBody {...props} player={player} />
              </SheetBody>
            </SheetContent>
          ) : null}
        </Sheet>
      );
    default: {
      const exhaustive: never = host;
      return exhaustive;
    }
  }
}

type SelectedPlayer = {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  /** Appearance figures, taken from the open kind when the player is ranked there. */
  readonly row: RankingRowDto;
  readonly standings: readonly RankingPlayerStanding[];
};

function selectedPlayer({ data, kind, names, selectedId, t }: DetailProps): SelectedPlayer | null {
  if (selectedId === null) return null;
  const standings = rankingPlayerStandings(data, selectedId);
  const ranked = standings.flatMap((standing) => (standing.status === "ranked" ? [standing] : []));
  const row = (ranked.find((standing) => standing.kind === kind) ?? ranked[0])?.row;
  if (!row) return null;
  const resolved = rankingNamesOf(names);
  return {
    id: selectedId,
    name: rankingPlayerName(resolved, row) ?? t("competition.rankings.player.unnamed"),
    team:
      row.teamId === null
        ? t("competition.rankings.team.none")
        : (resolved.teams.get(row.teamId) ?? t("competition.rankings.team.unnamed")),
    row,
    standings,
  };
}

function DetailAside(props: DetailProps & { readonly player: SelectedPlayer | null }) {
  const { player, t } = props;
  const headingId = useId();
  return (
    <aside
      aria-label={player ? undefined : t("competition.rankings.detail.label")}
      aria-labelledby={player ? headingId : undefined}
      {...applyStyles(styles.aside)}
    >
      {player ? (
        <>
          <div {...applyStyles(styles.asideHeader)}>
            <Heading as="h2" className={styles.name} id={headingId}>
              {player.name}
            </Heading>
            <Caption as="p">{player.team}</Caption>
          </div>
          <DetailBody {...props} player={player} />
        </>
      ) : (
        <div {...applyStyles(styles.prompt)}>
          <UserFocusIcon aria-hidden {...applyStyles(styles.promptIcon)} />
          <p {...applyStyles(typography.title, styles.promptTitle)}>
            {t("competition.rankings.detail.emptyTitle")}
          </p>
          <Caption as="p">{t("competition.rankings.detail.emptyDescription")}</Caption>
        </div>
      )}
    </aside>
  );
}

function DetailBody({
  formatters,
  kind,
  player,
  t,
}: DetailProps & { readonly player: SelectedPlayer }) {
  const sectionId = useId();
  return (
    <div {...applyStyles(styles.body)}>
      <dl {...applyStyles(styles.facts)}>
        <div {...applyStyles(styles.fact)}>
          <dt {...applyStyles(typography.label, styles.factTerm)}>
            {t("competition.rankings.column.matchesTitle")}
          </dt>
          <dd {...applyStyles(styles.factValue)}>
            {formatters.integer.format(player.row.matchesPlayed)}
          </dd>
        </div>
        <div {...applyStyles(styles.fact)}>
          <dt {...applyStyles(typography.label, styles.factTerm)}>
            {t("competition.rankings.column.minutesTitle")}
          </dt>
          <dd {...applyStyles(styles.factValue)}>
            {formatters.integer.format(player.row.minutes)}
          </dd>
        </div>
      </dl>
      <section aria-labelledby={sectionId} {...applyStyles(styles.section)}>
        <h3 id={sectionId} {...applyStyles(typography.label, styles.sectionTitle)}>
          {t("competition.rankings.detail.rankings")}
        </h3>
        <ul {...applyStyles(styles.list)}>
          {player.standings.map((standing) => (
            <StandingItem
              current={standing.kind === kind}
              formatters={formatters}
              key={standing.kind}
              standing={standing}
              t={t}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function StandingItem({
  current,
  formatters,
  standing,
  t,
}: {
  readonly current: boolean;
  readonly formatters: RankingFormatters;
  readonly standing: RankingPlayerStanding;
  readonly t: Translator;
}) {
  const copy = RANKING_KIND_COPY[standing.kind];
  const per90 = standing.status === "ranked" ? rankingPer90(standing.kind, standing.row) : null;
  return (
    <li
      aria-current={current ? "true" : undefined}
      data-ranking-standing={standing.kind}
      {...applyStyles(styles.item, current && styles.itemCurrent)}
    >
      {current ? <span aria-hidden {...applyStyles(styles.currentBar)} /> : null}
      <div {...applyStyles(styles.itemCopy)}>
        <span
          {...applyStyles(typography.body, styles.kindLabel, current && styles.kindLabelCurrent)}
        >
          {t(copy.tab)}
        </span>
        <Caption as="span">
          {standing.status === "ranked"
            ? t("competition.rankings.detail.position", {
                position: formatters.integer.format(standing.row.position),
                total: formatters.integer.format(standing.total),
              })
            : t(
                standing.status === "unranked"
                  ? "competition.rankings.detail.unranked"
                  : "competition.rankings.detail.notComputed",
              )}
        </Caption>
      </div>
      <div {...applyStyles(styles.itemFigure)}>
        {standing.status === "ranked" ? (
          <>
            <span {...applyStyles(typography.body, styles.value)}>
              <span {...applyStyles(styles.valueMuted)}>{t(copy.metric)} </span>
              {formatRankingValue(standing.kind, standing.row.value, formatters)}
            </span>
            {per90 === null ? null : (
              <Caption as="span">
                {t("competition.rankings.detail.per90", { rate: formatters.rate.format(per90) })}
              </Caption>
            )}
          </>
        ) : (
          <span aria-hidden {...applyStyles(typography.body, styles.valueMuted)}>
            —
          </span>
        )}
      </div>
    </li>
  );
}
