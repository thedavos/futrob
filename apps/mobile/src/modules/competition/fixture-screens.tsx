import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  bracketStages,
  competitionFixtureView,
  type FixtureEncounterView,
  type FixtureRoundView,
  type FixtureStageView,
} from "@futrob/sdk";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Button, EmptyState, List, ListItem, ListSection, Text } from "@/ui";
import { useCompetitionFixture } from "./competition-queries";
import {
  CompetitionStackScreen,
  CompetitionTabScreen,
  ReadState,
  competitionHref,
  formatDateTime,
  useCompetitionCopy,
  useCompetitionScope,
} from "./competition-read-frame";

/** «Calendario» tab: every stage, round and encounter of the current fixture. */
export function FixtureScreen() {
  const copy = useCompetitionCopy();
  const query = useCompetitionFixture(useCompetitionScope());
  return (
    <CompetitionTabScreen title={copy.fixture.title}>
      <ReadState query={query} copy={copy.fixture}>
        {(response) => {
          const view = competitionFixtureView(response);
          if (!view) {
            return (
              <EmptyState
                title={copy.fixture.emptyTitle}
                description={copy.fixture.emptyDescription}
              />
            );
          }
          return (
            <>
              <Text role="caption" color="muted-foreground">
                {copy.fixture.timeZone(view.timeZone)}
              </Text>
              {view.stages.map((stage) => (
                <StageRounds key={stage.id} stage={stage} timeZone={view.timeZone} />
              ))}
            </>
          );
        }}
      </ReadState>
    </CompetitionTabScreen>
  );
}

/** «Bracket»: the knockout and playoff stages, round by round. */
export function BracketScreen() {
  const copy = useCompetitionCopy();
  const router = useRouter();
  const scope = useCompetitionScope();
  const query = useCompetitionFixture(scope);
  return (
    <CompetitionStackScreen title={copy.bracket.title}>
      <ReadState query={query} copy={copy.bracket}>
        {(response) => {
          const view = competitionFixtureView(response);
          if (!view) {
            return (
              <EmptyState
                title={copy.bracket.emptyTitle}
                description={copy.bracket.emptyDescription}
              />
            );
          }
          const stages = bracketStages(view);
          if (stages.length === 0) {
            return (
              <EmptyState
                title={copy.bracket.noBracketTitle}
                description={copy.bracket.noBracketDescription}
                action={
                  <Button
                    variant="outline"
                    label={copy.bracket.calendarLink}
                    onPress={() => router.push(nativeRoute(competitionHref(scope, "/fixture")))}
                  />
                }
              />
            );
          }
          return stages.map((stage) => (
            <StageRounds key={stage.id} stage={stage} timeZone={view.timeZone} bracket />
          ));
        }}
      </ReadState>
    </CompetitionStackScreen>
  );
}

function StageRounds({
  stage,
  timeZone,
  bracket = false,
}: {
  stage: FixtureStageView;
  timeZone: string;
  bracket?: boolean;
}) {
  const copy = useCompetitionCopy();
  return (
    <View style={{ gap: theme.spacing[4] }}>
      <Text role="subtitle" accessibilityRole="header">
        {copy.stage[stage.kind]}
      </Text>
      {stage.rounds.map((round) => (
        <Round key={round.id} round={round} timeZone={timeZone} bracket={bracket} />
      ))}
    </View>
  );
}

function Round({
  round,
  timeZone,
  bracket,
}: {
  round: FixtureRoundView;
  timeZone: string;
  bracket: boolean;
}) {
  const copy = useCompetitionCopy();
  const title = `${copy.round(round.name)} · ${formatDateTime(round.scheduledStartAt, copy.locale, timeZone)}`;
  return (
    <ListSection title={title}>
      {round.encounters.length === 0 ? (
        <Text role="caption" color="muted-foreground">
          {copy.fixture.roundPending}
        </Text>
      ) : (
        <List>
          {round.encounters.map((encounter) => (
            <EncounterRow
              key={encounter.id}
              encounter={encounter}
              bracket={bracket}
              timeZone={timeZone}
            />
          ))}
        </List>
      )}
    </ListSection>
  );
}

function EncounterRow({
  encounter,
  bracket,
  timeZone,
}: {
  encounter: FixtureEncounterView;
  bracket: boolean;
  timeZone: string;
}) {
  const copy = useCompetitionCopy();
  const home = copy.side(encounter.home);
  const away = copy.side(encounter.away);
  if (encounter.kind === "bye") {
    const resting = encounter.home.kind === "bye" ? away : home;
    return <ListItem title={copy.fixture.bye(resting)} description={groupLine(encounter, copy)} />;
  }
  const withdrawn = [encounter.home, encounter.away].some(
    (side) => side.kind === "team" && side.withdrawn,
  );
  const details = [
    formatDateTime(encounter.scheduledStartAt, copy.locale, timeZone),
    groupLine(encounter, copy),
    bracket && encounter.officialMatchCount === 2
      ? copy.bracket.twoLegs
      : copy.fixture.slots(encounter.officialMatchCount),
    encounter.kind === "closed" ? copy.fixture.closed : undefined,
    withdrawn ? copy.fixture.withdrawn : undefined,
  ].filter((part): part is string => Boolean(part));
  return <ListItem title={copy.fixture.matchup(home, away)} description={details.join(" · ")} />;
}

function groupLine(
  encounter: FixtureEncounterView,
  copy: ReturnType<typeof useCompetitionCopy>,
): string | undefined {
  return encounter.group ? copy.fixture.group(encounter.group) : undefined;
}
