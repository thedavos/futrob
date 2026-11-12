import { useState } from "react";
import { ScrollView, View } from "react-native";
import type { RankingKindDto, RankingRowDto } from "@futrob/api-contracts";
import {
  DEFAULT_RANKING_KIND,
  RANKING_KINDS,
  playoffCut,
  rankingPlayerName,
  rankingTeamIds,
  selectRankingSnapshot,
  standingsTableRows,
  swissStandingsProgress,
  type StandingsTableRow,
  type SwissStandingsProgress,
} from "@futrob/sdk";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { theme } from "@/theme/theme";
import { EmptyState, List, Tabs, Text } from "@/ui";
import {
  useCompetitionRankings,
  useCompetitionStandings,
  useRankingNames,
  useStandingsTeamNames,
  type CompetitionScope,
  type RankingNamesState,
} from "./competition-queries";
import {
  AccessGate,
  CompetitionStackScreen,
  CompetitionTabScreen,
  ReadState,
  RefreshNotice,
  formatDateTime,
  useCompetitionCopy,
  useCompetitionScope,
} from "./competition-read-frame";

/**
 * «Clasificación» tab. Official standings come from `statistics` (`statistics.read`), so the
 * screen asks `EffectiveAccess` before reading, as the web standings page does.
 */
export function StandingsScreen() {
  const copy = useCompetitionCopy();
  const scope = useCompetitionScope();
  const forbidden = {
    title: copy.standings.forbiddenTitle,
    description: copy.standings.forbiddenDescription,
  };
  return (
    <CompetitionTabScreen title={copy.standings.title}>
      <AccessGate
        scope={scope}
        permission={MOBILE_PERMISSION.statisticsRead}
        loadingLabel={copy.standings.loading}
        forbidden={forbidden}
      >
        <StandingsTable scope={scope} forbidden={forbidden} />
      </AccessGate>
    </CompetitionTabScreen>
  );
}

function StandingsTable({
  scope,
  forbidden,
}: {
  scope: CompetitionScope;
  forbidden: { title: string; description: string };
}) {
  const copy = useCompetitionCopy();
  const query = useCompetitionStandings(scope, true);
  const snapshot = query.data && "standings" in query.data ? query.data.standings : null;
  const names = useStandingsTeamNames(scope, Boolean(snapshot && snapshot.rows.length > 0));
  return (
    <ReadState query={query} copy={copy.standings} forbidden={forbidden}>
      {({ standings }) => {
        if (!standings || standings.rows.length === 0) {
          return (
            <EmptyState
              title={copy.standings.emptyTitle}
              description={copy.standings.emptyDescription}
            />
          );
        }
        const progress = swissStandingsProgress(standings.swiss);
        const cut = playoffCut(standings);
        return (
          <>
            <Text role="caption" color="muted-foreground">
              {[
                progress ? swissLine(progress, copy) : null,
                copy.standings.updated(formatDateTime(standings.updatedAt, copy.locale)),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <List label={copy.standings.title}>
              <StandingsHeader />
              {standingsTableRows(standings, names).map((row) => (
                <StandingsRow key={row.row.teamId} row={row} />
              ))}
            </List>
            {cut !== null ? (
              <Text role="caption" color="muted-foreground">
                {copy.standings.playoffCut(cut)}
              </Text>
            ) : null}
          </>
        );
      }}
    </ReadState>
  );
}

function swissLine(
  progress: SwissStandingsProgress,
  copy: ReturnType<typeof useCompetitionCopy>,
): string {
  switch (progress.kind) {
    case "final":
      return copy.standings.swissFinal;
    case "round":
      return copy.standings.swissRound(progress.current, progress.total);
    case "between":
      return copy.standings.swissBetween(progress.completed, progress.total);
  }
}

const NUMBER_COLUMN = {
  width: 40,
  textAlign: "right" as const,
  fontVariant: ["tabular-nums" as const],
};

function StandingsHeader() {
  const { columns } = useCompetitionCopy().standings;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={rowStyle}
    >
      <Text role="caption" color="muted-foreground" style={{ flex: 1 }}>
        {" "}
      </Text>
      {[columns.played, columns.goalDifference, columns.points].map((label) => (
        <Text key={label} role="caption" color="muted-foreground" style={NUMBER_COLUMN}>
          {label}
        </Text>
      ))}
    </View>
  );
}

const rowStyle = {
  minHeight: theme.controlHeight,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: theme.spacing[2],
  paddingHorizontal: theme.spacing[4],
  paddingVertical: theme.spacing[2],
};

function StandingsRow({ row: { row, teamName, lastAboveCut } }: { row: StandingsTableRow }) {
  const copy = useCompetitionCopy();
  const team = teamName ?? copy.standings.teamUnresolved;
  const withdrawn = row.swiss?.withdrawn === true;
  return (
    <View
      accessible
      accessibilityLabel={`${copy.standings.row({
        position: row.position,
        team,
        played: row.played,
        goalDifference: row.goalDifference,
        points: row.points,
      })}${withdrawn ? `. ${copy.standings.withdrawn}` : ""}`}
      style={[
        rowStyle,
        lastAboveCut ? { borderBottomWidth: 2, borderBottomColor: theme.colors.primary } : null,
      ]}
    >
      <Text role="label" style={{ width: 28 }}>
        {row.position}
      </Text>
      <View style={{ flex: 1 }}>
        <Text role="label" numberOfLines={1} color={teamName ? "foreground" : "muted-foreground"}>
          {team}
        </Text>
        {withdrawn ? (
          <Text role="caption" color="muted-foreground">
            {copy.standings.withdrawn}
          </Text>
        ) : null}
      </View>
      <Text style={NUMBER_COLUMN}>{row.played}</Text>
      <Text style={NUMBER_COLUMN}>{row.goalDifference}</Text>
      <Text style={[NUMBER_COLUMN, { fontFamily: theme.fontFamily.semibold }]}>{row.points}</Text>
    </View>
  );
}

/** «Rankings»: player rankings by kind, named through each team's roster. */
export function RankingsScreen() {
  const copy = useCompetitionCopy();
  const scope = useCompetitionScope();
  const forbidden = {
    title: copy.rankings.forbiddenTitle,
    description: copy.rankings.forbiddenDescription,
  };
  return (
    <CompetitionStackScreen title={copy.rankings.title}>
      <AccessGate
        scope={scope}
        permission={MOBILE_PERMISSION.statisticsRead}
        loadingLabel={copy.rankings.loading}
        forbidden={forbidden}
      >
        <Rankings scope={scope} forbidden={forbidden} />
      </AccessGate>
    </CompetitionStackScreen>
  );
}

function Rankings({
  scope,
  forbidden,
}: {
  scope: CompetitionScope;
  forbidden: { title: string; description: string };
}) {
  const copy = useCompetitionCopy();
  const [kind, setKind] = useState<RankingKindDto>(DEFAULT_RANKING_KIND);
  const query = useCompetitionRankings(scope, true);
  const snapshot =
    query.data && "rankings" in query.data ? selectRankingSnapshot(query.data, kind) : null;
  const names = useRankingNames(scope, rankingTeamIds(snapshot));
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Tabs
          label={copy.rankings.kinds}
          variant="pills"
          value={kind}
          onChange={setKind}
          items={RANKING_KINDS.map((id) => ({ id, label: copy.rankings.kind[id] }))}
        />
      </ScrollView>
      <ReadState query={query} copy={copy.rankings} forbidden={forbidden}>
        {(response) => {
          const selected = selectRankingSnapshot(response, kind);
          if (!selected) {
            return (
              <EmptyState
                title={copy.rankings.notComputedTitle}
                description={copy.rankings.notComputedDescription}
              />
            );
          }
          if (selected.rows.length === 0) {
            return (
              <EmptyState
                title={copy.rankings.emptyTitle}
                description={copy.rankings.emptyDescription}
              />
            );
          }
          return (
            <>
              <Text role="caption" color="muted-foreground">
                {copy.rankings.criterion[kind]}
              </Text>
              <RankingNamesNotice names={names} />
              <List label={copy.rankings.kind[kind]}>
                {selected.rows.map((row) => (
                  <RankingRow key={row.playerProfileId} row={row} kind={kind} names={names} />
                ))}
              </List>
            </>
          );
        }}
      </ReadState>
    </>
  );
}

function RankingNamesNotice({ names }: { names: RankingNamesState }) {
  const copy = useCompetitionCopy();
  if (names.status !== "ready") return null;
  if (names.retry)
    return <RefreshNotice message={copy.rankings.namesError} onRetry={names.retry} />;
  if (names.restricted) {
    return (
      <Text role="caption" color="muted-foreground">
        {copy.rankings.namesRestricted}
      </Text>
    );
  }
  return null;
}

function RankingRow({
  row,
  kind,
  names,
}: {
  row: RankingRowDto;
  kind: RankingKindDto;
  names: RankingNamesState;
}) {
  const copy = useCompetitionCopy();
  const ready = names.status === "ready";
  const player = ready
    ? (rankingPlayerName(names.names, row) ?? copy.rankings.playerUnnamed)
    : copy.rankings.namesLoading;
  const team =
    row.teamId === null
      ? copy.rankings.teamNone
      : ready
        ? (names.names.teams.get(row.teamId) ?? copy.rankings.teamUnnamed)
        : copy.rankings.namesLoading;
  const value = new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 2 }).format(row.value);
  const details = `${team} · ${copy.rankings.matches(row.matchesPlayed)}`;
  return (
    <View
      accessible
      accessibilityLabel={`${row.position}. ${player}, ${details}. ${copy.rankings.metric[kind]}: ${value}`}
      style={rowStyle}
    >
      <Text role="label" style={{ width: 28 }}>
        {row.position}
      </Text>
      <View style={{ flex: 1, gap: theme.spacing[1] }}>
        <Text role="label" numberOfLines={1}>
          {player}
        </Text>
        <Text role="caption" color="muted-foreground" numberOfLines={1}>
          {details}
        </Text>
      </View>
      <Text role="subtitle">{value}</Text>
    </View>
  );
}
