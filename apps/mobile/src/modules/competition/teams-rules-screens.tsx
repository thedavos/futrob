import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { CompetitionMatchRulesDto } from "@futrob/api-contracts";
import { rulesStages, showsResolution, tiebreakCriteria } from "@futrob/sdk";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Text,
} from "@/ui";
import {
  isRefused,
  useCompetitionRules,
  useCompetitionTeam,
  useCompetitionTeams,
} from "./competition-queries";
import {
  CompetitionStackScreen,
  ReadState,
  RefreshNotice,
  competitionHref,
  useCompetitionCopy,
  useCompetitionScope,
} from "./competition-read-frame";

/** «Equipos»: the competition's teams, page by page; each row opens its roster. */
export function TeamsScreen() {
  const copy = useCompetitionCopy();
  const router = useRouter();
  const scope = useCompetitionScope();
  const query = useCompetitionTeams(scope);
  const pages = query.data?.pages ?? [];
  const refusal = pages.find(isRefused);
  const items = pages.flatMap((page) => (isRefused(page) ? [] : page.items));

  const body = (() => {
    if (query.data === undefined) {
      return query.isError ? (
        <ErrorState
          title={copy.teams.error}
          retryLabel={copy.retry}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <LoadingState label={copy.teams.loading} />
      );
    }
    if (refusal) {
      const text = refusal.refused === "forbidden" ? copy.forbidden : copy.notFound;
      return <EmptyState title={text.title} description={text.description} />;
    }
    if (items.length === 0) {
      return <EmptyState title={copy.teams.emptyTitle} description={copy.teams.emptyDescription} />;
    }
    return (
      <>
        {query.isError ? (
          <RefreshNotice message={copy.teams.refreshError} onRetry={() => void query.refetch()} />
        ) : null}
        <List label={copy.teams.title}>
          {items.map((item) => (
            <ListItem
              key={item.team.id}
              title={item.team.name}
              description={[
                copy.teams.entry[item.entry.status] ?? null,
                copy.teams.members(item.roster.memberCount, item.roster.maxSize),
              ]
                .filter(Boolean)
                .join(" · ")}
              onPress={() =>
                router.push(
                  nativeRoute(competitionHref(scope, `/teams/${encodeURIComponent(item.team.id)}`)),
                )
              }
            />
          ))}
        </List>
        {query.hasNextPage ? (
          <Button
            variant="outline"
            label={copy.teams.loadMore}
            loading={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
          />
        ) : null}
      </>
    );
  })();

  return <CompetitionStackScreen title={copy.teams.title}>{body}</CompetitionStackScreen>;
}

/** One team: entry, roster state, EA club and members. Read only. */
export function TeamDetailScreen() {
  const copy = useCompetitionCopy();
  const scope = useCompetitionScope();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const query = useCompetitionTeam(scope, teamId);
  const title = query.data && !isRefused(query.data) ? query.data.team.name : copy.teams.title;
  return (
    <CompetitionStackScreen title={title}>
      <ReadState query={query} copy={copy.teams}>
        {(team) => (
          <>
            <Text role="caption" color="muted-foreground">
              {[
                copy.teams.entry[team.entry.status],
                team.roster.state === "open" ? copy.teams.rosterOpen : copy.teams.rosterClosed,
                copy.teams.members(team.roster.memberCount, team.roster.maxSize),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <Text role="caption" color="muted-foreground">
              {team.externalClub
                ? copy.teams.club(team.externalClub.externalClubName)
                : copy.teams.noClub}
            </Text>
            <ListSection title={copy.teams.roster}>
              {team.members.length === 0 ? (
                <EmptyState title={copy.teams.emptyRoster} />
              ) : (
                <List label={copy.teams.roster}>
                  {team.members.map((member) => (
                    <ListItem
                      key={member.membership.id}
                      title={member.presentation.displayName}
                      description={copy.teams.role[member.membership.role]}
                    />
                  ))}
                </List>
              )}
            </ListSection>
          </>
        )}
      </ReadState>
    </CompetitionStackScreen>
  );
}

/** «Reglamento»: the persisted rules, read only. Editing stays in setup on web. */
export function RulesScreen() {
  const copy = useCompetitionCopy();
  const query = useCompetitionRules(useCompetitionScope());
  const r = copy.rules;
  return (
    <CompetitionStackScreen title={r.title}>
      <ReadState query={query} copy={r}>
        {(draft) => (
          <>
            <Text role="caption" color="muted-foreground">
              {`${r.status[draft.competition.status]} · ${
                draft.competition.status === "draft" ? r.noticeDraft : r.noticeLocked
              }`}
            </Text>
            <Card title={r.formatTitle}>
              <Fact label={r.formatLabel} value={r.format[draft.competition.format]} />
              <Fact
                label={r.teams}
                value={r.teamsRange(draft.competition.teams.min, draft.competition.teams.max)}
              />
            </Card>
            {rulesStages(draft).map((stage) => (
              <StageRules key={stage.key} title={copy.stage[stage.label]} rules={stage.rules} />
            ))}
            <Card title={r.rosterTitle}>
              <Fact
                label={r.rosterMax}
                value={
                  draft.rules.maxRosterSize === null
                    ? r.rosterDefault
                    : r.players(draft.rules.maxRosterSize)
                }
              />
            </Card>
            <Card title={r.tiebreaksTitle}>
              <Text role="caption" color="muted-foreground">
                {r.tiebreaksDescription}
              </Text>
              {tiebreakCriteria(draft.competition.format).map((criterion, index) => (
                <Text key={criterion}>{`${index + 1}. ${r.tiebreak[criterion]}`}</Text>
              ))}
            </Card>
          </>
        )}
      </ReadState>
    </CompetitionStackScreen>
  );
}

function StageRules({ title, rules }: { title: string; rules: CompetitionMatchRulesDto }) {
  const r = useCompetitionCopy().rules;
  return (
    <Card title={title}>
      <Text role="label" accessibilityRole="header">
        {r.scoring}
      </Text>
      <Fact label={r.win} value={String(rules.winPoints)} />
      <Fact label={r.draw} value={String(rules.drawPoints)} />
      <Fact label={r.loss} value={String(rules.lossPoints)} />
      <Text role="label" accessibilityRole="header">
        {r.encounter}
      </Text>
      <Fact label={r.matchesPerEncounter} value={r.matches(rules.officialMatchesPerEncounter)} />
      {showsResolution(rules) ? (
        <Fact
          label={r.resolution}
          value={rules.resolutionMode === "aggregate_score" ? r.aggregate : r.independent}
        />
      ) : null}
      <Text role="label" accessibilityRole="header">
        {r.reschedule}
      </Text>
      {rules.allowRescheduling ? (
        <>
          <Fact
            label={r.rescheduleMax}
            value={
              rules.maxReschedulesPerTeam === null
                ? r.unlimited
                : String(rules.maxReschedulesPerTeam)
            }
          />
          <Fact label={r.rescheduleNotice} value={r.hours(rules.minimumRescheduleNoticeHours)} />
          <Fact label={r.rescheduleExpiry} value={r.hours(rules.rescheduleProposalExpiryHours)} />
          <Fact
            label={r.opponentApproval}
            value={rules.rescheduleRequiresOpponentApproval ? r.required : r.notRequired}
          />
          <Fact
            label={r.organizerApproval}
            value={rules.rescheduleRequiresOrganizerApproval ? r.required : r.notRequired}
          />
        </>
      ) : (
        <Text color="muted-foreground">{r.rescheduleNotAllowed}</Text>
      )}
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.spacing[3] }}
    >
      <Text color="muted-foreground" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: theme.fontFamily.semibold }}>{value}</Text>
    </View>
  );
}
