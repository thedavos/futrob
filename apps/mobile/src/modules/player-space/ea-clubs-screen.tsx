import { useState } from "react";
import { View } from "react-native";
import {
  EA_SEARCH_PLATFORM_OPTIONS,
  eaSearchPlatformFromGamePlatform,
  type EaSearchPlatform,
  type ExternalClubDto,
} from "@futrob/api-contracts";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { rememberPersonalClub } from "@/modules/navigation/personal-club";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Text,
} from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import {
  isUnauthorized,
  useAssociateClub,
  useClubSearch,
  usePersonalClub,
} from "./player-space-data";
import { LoginRedirect } from "./player-space-states";

type Copy = ReturnType<typeof playerSpaceCopy>;

/** Hard cap on clubs shown after a search, as on web. */
const MAX_RESULTS = 3;

function platformLabel(platform: string): string {
  return EA_SEARCH_PLATFORM_OPTIONS.find((option) => option.value === platform)?.label ?? platform;
}

/**
 * Clubes EA: the clubs associated with the player. Choosing one makes it the personal space's
 * club for every personal tab; «Añadir club» searches EA and associates a new one.
 */
export function EaClubsScreen() {
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const personal = usePersonalClub();
  const [adding, setAdding] = useState(false);

  if (isUnauthorized(personal.profile.error)) return <LoginRedirect />;

  function body() {
    if (personal.profile.isError) {
      return (
        <ErrorState
          title={copy.clubs.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={personal.profile.isFetching}
          onRetry={() => void personal.profile.refetch()}
        />
      );
    }
    if (personal.profile.isPending) return <LoadingState label={copy.clubs.loading} />;
    const add = (
      <Button
        variant={personal.clubs.length === 0 ? "primary" : "secondary"}
        label={copy.clubs.add}
        onPress={() => setAdding(true)}
      />
    );
    if (personal.clubs.length === 0) {
      return (
        <EmptyState
          title={copy.clubs.emptyTitle}
          description={copy.clubs.emptyDescription}
          action={add}
        />
      );
    }
    return (
      <>
        <List>
          {personal.clubs.map((club) => {
            const selected = club.externalClubId === personal.clubId;
            return (
              <ListItem
                key={club.externalClubId}
                title={club.externalClubName}
                description={[
                  selected ? copy.clubs.selectedHint : null,
                  platformLabel(club.platform),
                  club.gameEdition.toUpperCase(),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                selected={selected}
                onPress={() => rememberPersonalClub(club.externalClubId)}
              />
            );
          })}
        </List>
        <View style={{ alignItems: "flex-start" }}>{add}</View>
      </>
    );
  }

  return (
    <StackFrame title={copy.clubs.title} fallbackHref="/player/more">
      <Text color="muted-foreground">{copy.clubs.description}</Text>
      {body()}
      {adding ? (
        <AddClubDialog
          copy={copy}
          associatedIds={personal.clubs.map((club) => club.externalClubId)}
          defaultPlatform={eaSearchPlatformFromGamePlatform(
            personal.profile.data?.gameAccounts[0]?.platform ?? null,
          )}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </StackFrame>
  );
}

function AddClubDialog({
  copy,
  associatedIds,
  defaultPlatform,
  onClose,
}: {
  copy: Copy;
  associatedIds: readonly string[];
  defaultPlatform: EaSearchPlatform;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<EaSearchPlatform>(defaultPlatform);
  const [submitted, setSubmitted] = useState<{ query: string; platform: string } | null>(null);
  const results = useClubSearch(submitted);
  const associate = useAssociateClub();

  if (isUnauthorized(results.error) || isUnauthorized(associate.error)) return <LoginRedirect />;

  function search() {
    const query = name.trim();
    if (query) setSubmitted({ query, platform });
  }

  function choose(club: ExternalClubDto) {
    associate.mutate(
      {
        providerKey: club.providerKey,
        externalClubId: club.externalClubId,
        platform: club.platform,
        gameEdition: club.gameEdition,
        name: club.name,
        imageUrl: club.imageUrl,
      },
      { onSuccess: onClose },
    );
  }

  function found() {
    if (submitted === null) return null;
    if (results.isError) {
      return (
        <Text role="caption" color="destructive" accessibilityRole="alert">
          {copy.clubs.searchError}
        </Text>
      );
    }
    if (!results.data) return <LoadingState label={copy.clubs.searching} rows={2} />;
    const clubs = results.data.clubs.slice(0, MAX_RESULTS);
    if (clubs.length === 0) {
      return (
        <Text role="caption" color="muted-foreground">
          {copy.clubs.noResults}
        </Text>
      );
    }
    return (
      <List>
        {clubs.map((club) => {
          const associated = associatedIds.includes(club.externalClubId);
          return (
            <ListItem
              key={club.externalClubId}
              title={club.name}
              description={
                associated
                  ? copy.clubs.associated
                  : `${platformLabel(club.platform)} · ${club.gameEdition.toUpperCase()}`
              }
              disabled={associated || associate.isPending}
              onPress={() => choose(club)}
            />
          );
        })}
      </List>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={copy.clubs.addTitle}
      description={copy.clubs.addDescription}
      closeLabel={copy.clubs.close}
    >
      <View style={{ gap: theme.spacing[4] }}>
        <Input
          label={copy.clubs.searchLabel}
          value={name}
          onChangeText={setName}
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <ListSection title={copy.clubs.platformLabel}>
          <List label={copy.clubs.platformLabel}>
            {EA_SEARCH_PLATFORM_OPTIONS.map((option) => (
              <ListItem
                key={option.value}
                title={option.label}
                selected={platform === option.value}
                onPress={() => setPlatform(option.value)}
              />
            ))}
          </List>
        </ListSection>
        <Button
          variant="secondary"
          label={copy.clubs.search}
          loading={submitted !== null && results.isFetching}
          onPress={search}
        />
        {found()}
        {associate.isError ? (
          <Text role="caption" color="destructive" accessibilityRole="alert">
            {copy.clubs.associateFailed}
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}
