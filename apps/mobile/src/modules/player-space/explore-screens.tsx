import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { exploreViewerRelation, FutrobApiError, workspaceContextPath } from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  List,
  ListItem,
  LoadingState,
  Text,
} from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import {
  isNotFound,
  isUnauthorized,
  useExploreCompetition,
  useExploreCompetitions,
  useMyCompetitions,
  useMyMemberships,
} from "./player-space-data";
import { LoginRedirect } from "./player-space-states";

const EXPLORE_HREF = "/player/explore";

/** Explorar: published competitions open for entries or in progress, searchable by name. */
export function ExploreScreen() {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const explore = useExploreCompetitions(query);

  if (isUnauthorized(explore.error)) return <LoginRedirect />;

  function search() {
    setQuery(draft.trim());
  }

  function body() {
    if (explore.isError && !explore.data) {
      return (
        <ErrorState
          title={copy.explore.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={explore.isFetching}
          onRetry={() => void explore.refetch()}
        />
      );
    }
    if (!explore.data) return <LoadingState label={copy.explore.loading} />;
    const items = explore.data.pages.flatMap((page) => page.items);
    if (items.length === 0) {
      return query ? (
        <EmptyState
          title={copy.explore.filteredEmptyTitle}
          description={copy.explore.filteredEmptyDescription}
          action={
            <Button
              variant="secondary"
              label={copy.explore.clear}
              onPress={() => {
                setDraft("");
                setQuery("");
              }}
            />
          }
        />
      ) : (
        <EmptyState title={copy.explore.noneTitle} description={copy.explore.noneDescription} />
      );
    }
    return (
      <>
        <List>
          {items.map((item) => (
            <ListItem
              key={item.competition.id}
              title={item.competition.name}
              description={[
                copy.explore.organizer(item.organization.name),
                copy.status[item.competition.status],
                copy.explore.teams(item.approvedTeamCount),
              ].join(" · ")}
              onPress={() =>
                router.push(
                  nativeRoute(`${EXPLORE_HREF}/${encodeURIComponent(item.competition.id)}`),
                )
              }
            />
          ))}
        </List>
        {explore.isFetchNextPageError ? (
          <Text role="caption" color="destructive" accessibilityRole="alert">
            {copy.explore.error}
          </Text>
        ) : null}
        {explore.hasNextPage ? (
          <Button
            variant="outline"
            label={copy.explore.more}
            loading={explore.isFetchingNextPage}
            onPress={() => void explore.fetchNextPage()}
          />
        ) : null}
      </>
    );
  }

  return (
    <StackFrame title={copy.explore.title} fallbackHref="/player/competitions">
      <Text color="muted-foreground">{copy.explore.description}</Text>
      <View style={{ gap: theme.spacing[3] }}>
        <Input
          label={copy.explore.searchLabel}
          placeholder={copy.explore.searchPlaceholder}
          value={draft}
          onChangeText={setDraft}
          returnKeyType="search"
          onSubmitEditing={search}
          maxLength={120}
        />
        <Button variant="secondary" label={copy.explore.search} onPress={search} />
      </View>
      {body()}
    </StackFrame>
  );
}

/**
 * One explored competition: its facts and, by the viewer's relation (as web), the way into
 * its context. Applying with a team is the captain's flow and is not offered here.
 */
export function ExploreDetailScreen({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const query = useExploreCompetition(competitionId);
  const memberships = useMyMemberships();
  const mine = useMyCompetitions();

  if (isUnauthorized(query.error)) return <LoginRedirect />;

  function body() {
    if (query.isError) {
      const notFound =
        isNotFound(query.error) ||
        (query.error instanceof FutrobApiError &&
          query.error.code === "competitions.not_discoverable");
      if (notFound) {
        return (
          <EmptyState
            title={copy.explore.notFoundTitle}
            description={copy.explore.notFoundDescription}
            action={
              <Button
                variant="secondary"
                label={copy.explore.backToExplore}
                onPress={() => router.replace(nativeRoute(EXPLORE_HREF))}
              />
            }
          />
        );
      }
      return (
        <ErrorState
          title={copy.explore.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (!query.data) return <LoadingState label={copy.explore.detailLoading} />;

    const { competition, organization, approvedTeamCount } = query.data;
    const relation = exploreViewerRelation({
      organizationId: organization.id,
      competitionId: competition.id,
      memberships: memberships.data?.memberships ?? [],
      accessibleCompetitions: mine.data?.competitions ?? [],
    });
    const facts: [string, string][] = [
      [copy.explore.facts.status, copy.status[competition.status]],
      [copy.explore.facts.organizer, organization.name],
      [copy.explore.facts.format, copy.format[competition.format]],
      [copy.explore.facts.region, copy.regions[competition.region]],
      [copy.explore.facts.platform, copy.platforms[competition.platform]],
      [copy.explore.facts.edition, competition.gameEdition],
      [copy.explore.facts.timeZone, competition.timeZone],
      [
        copy.explore.facts.teams,
        competition.teams.max === null
          ? String(approvedTeamCount)
          : `${approvedTeamCount} / ${competition.teams.max}`,
      ],
    ];
    const contextHref = workspaceContextPath({
      kind: "competition",
      organizationId: organization.id,
      competitionId: competition.id,
    });

    return (
      <>
        <Text role="title">{competition.name}</Text>
        <Card>
          {facts.map(([label, value]) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${label}: ${value}`}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: theme.spacing[3],
              }}
            >
              <Text color="muted-foreground">{label}</Text>
              <Text role="label" style={{ flexShrink: 1, textAlign: "right" }}>
                {value}
              </Text>
            </View>
          ))}
        </Card>
        {relation === "visitor" ? null : (
          <View style={{ gap: theme.spacing[2] }}>
            {relation === "participant" ? (
              <Text role="caption" color="muted-foreground">
                {copy.explore.participating}
              </Text>
            ) : null}
            <Button
              variant="secondary"
              label={relation === "manager" ? copy.explore.manage : copy.explore.open}
              onPress={() => router.push(nativeRoute(contextHref))}
            />
          </View>
        )}
      </>
    );
  }

  return (
    <StackFrame title={copy.explore.title} fallbackHref={EXPLORE_HREF}>
      {body()}
    </StackFrame>
  );
}
