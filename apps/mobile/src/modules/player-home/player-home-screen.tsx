import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import { theme } from "@/theme/theme";
import { Button, EmptyState, Text } from "@/ui";
import { playerHomeCopy } from "./player-home-copy";
import { resolvePlayerHome } from "./player-home-model";
import {
  ClubChoices,
  Competitions,
  EaCard,
  Hero,
  Invitations,
  LastMatch,
  Performance,
} from "./player-home-sections";
import { usePlayerHome } from "./use-player-home";

function competitionRoute(organizationId: string, competitionId: string): string {
  return `/orgs/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`;
}

/**
 * Personal home on `/player`. The `club` route param selects the club; without it the first
 * associated club becomes the selection (FTR-PLAYER-006), written back to the route.
 */
export function PlayerHomeScreen({ language }: { language: MobileLanguage }) {
  const router = useRouter();
  const { club } = useLocalSearchParams<{ club?: string }>();
  const copy = playerHomeCopy(language);
  const home = usePlayerHome(club || undefined, {
    onInitialClub: (externalClubId) => router.setParams({ club: externalClubId }),
    onUnauthorized: () => void onProductUnauthorized(() => router.replace(LOGIN_ROUTE)),
  });
  const open = (route: string) => router.push(nativeRoute(route));
  const selectClub = (externalClubId: string) => router.setParams({ club: externalClubId });

  if (!home.snapshot) {
    return home.failed && !home.loading ? (
      <EmptyState
        title={copy.loadFailedTitle}
        description={copy.loadFailedDescription}
        action={<Button label={copy.retry} onPress={home.retry} />}
      />
    ) : (
      <View accessibilityRole="progressbar" accessibilityLabel={copy.loading}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text color="muted-foreground" style={{ textAlign: "center" }}>
          {copy.loading}
        </Text>
      </View>
    );
  }

  const model = resolvePlayerHome(home.snapshot);
  const clubs =
    home.snapshot.profile.kind === "ready" ? home.snapshot.profile.data.externalClubs : [];
  const slot = { copy, language, retry: home.retry, refreshing: home.loading };

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <View style={{ gap: theme.spacing[1] }}>
        <Text role="heading" accessibilityRole="header">
          {copy.title}
        </Text>
        {model.selectedClub ? (
          <Text role="subtitle" color="muted-foreground">
            {copy.activity(model.selectedClub.externalClubName)}
          </Text>
        ) : null}
        {home.loading ? (
          <Text role="caption" color="muted-foreground" accessibilityLiveRegion="polite">
            {copy.updating}
          </Text>
        ) : null}
      </View>
      {model.headerCta === "refresh-matches" ? (
        <Button label={copy.refreshMatches} loading={home.loading} onPress={home.retry} />
      ) : null}
      {clubs.length > 0 && model.kind === "dashboard" ? (
        <ClubChoices
          clubs={clubs}
          copy={copy}
          selected={model.selectedClub?.externalClubId}
          onSelect={selectClub}
        />
      ) : null}
      <Hero
        model={model}
        clubs={clubs}
        onSelect={selectClub}
        onOpenCompetition={(encounter) =>
          open(competitionRoute(encounter.competition.organizationId, encounter.competition.id))
        }
        {...slot}
      />
      <Invitations slot={model.invitations} {...slot} />
      <EaCard slot={model.eaCard} {...slot} />
      <Performance slot={model.performance} {...slot} />
      <LastMatch slot={model.bottomLeft} {...slot} />
      <Competitions
        slot={model.bottomRight}
        onOpen={(competition) => open(competitionRoute(competition.organizationId, competition.id))}
        {...slot}
      />
    </View>
  );
}
