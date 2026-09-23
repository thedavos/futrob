import { View } from "react-native";
import {
  gamePlatformSchema,
  type CompetitionFormatDto,
  type CompetitionRegionDto,
  type ExternalClubDto,
  type GamePlatformDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import { theme } from "@/theme/theme";
import { Button, Input, Text } from "@/ui";
import type { NativeOnboardingFlow } from "./onboarding-flow.ts";
import { STEPS_BY_PATH, missingRequiredStep, stepsForPath } from "./onboarding-flow.ts";
import type { MobileCopyKey, MobileLanguage } from "./mobile-copy.ts";

type Props = {
  flow: NativeOnboardingFlow;
  step: OnboardingStepDto;
  t: (key: MobileCopyKey) => string;
  language: MobileLanguage;
  busy: boolean;
  clubQuery: string;
  setClubQuery: (value: string) => void;
  clubs: readonly ExternalClubDto[];
  setClubs: (clubs: readonly ExternalClubDto[]) => void;
  change: (patch: Parameters<NativeOnboardingFlow["update"]>[0]) => Promise<void>;
  run: (operation: () => Promise<void>) => Promise<void>;
  continueFlow: () => Promise<void>;
  goTo: (step: OnboardingStepDto) => Promise<void>;
  refresh: () => void;
};

const REGIONS: readonly CompetitionRegionDto[] = [
  "america",
  "south-america",
  "north-central-america",
  "europe",
  "africa",
  "asia",
  "middle-east",
  "oceania",
];
const FORMATS: readonly CompetitionFormatDto[] = [
  "league",
  "knockout",
  "groups-knockout",
  "league-playoffs",
];

const editTitleKey = {
  intention: "intention",
  organization: "organization",
  competition: "competition",
  invitation: "invitation",
  game: "account",
  "game-account": "account",
  club: "club",
  review: "review",
} as const satisfies Record<OnboardingStepDto, MobileCopyKey>;

const choiceTranslations = {
  "south-america": ["Sudamérica", "South America"],
  "north-central-america": ["Norte y Centroamérica", "North & Central America"],
  america: ["América", "Americas"],
  europe: ["Europa", "Europe"],
  africa: ["África", "Africa"],
  asia: ["Asia", "Asia"],
  "middle-east": ["Medio Oriente", "Middle East"],
  oceania: ["Oceanía", "Oceania"],
  league: ["Liga", "League"],
  knockout: ["Eliminación", "Knockout"],
  "groups-knockout": ["Grupos y eliminación", "Groups and knockout"],
  "league-playoffs": ["Liga con playoffs", "League with playoffs"],
} as const;

function choiceLabel(option: string, language: MobileLanguage): string {
  const labels = Object.entries(choiceTranslations).find(([key]) => key === option)?.[1];
  return labels?.[language === "es" ? 0 : 1] ?? option.replaceAll("-", " ");
}

function ChoiceGroup<T extends string>({
  label,
  values,
  value,
  onSelect,
  language,
}: {
  label: string;
  values: readonly T[];
  value: T | undefined;
  onSelect: (value: T) => void;
  language: MobileLanguage;
}) {
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <Text role="label">{label}</Text>
      <View style={{ gap: theme.spacing[2] }}>
        {values.map((option) => (
          <Button
            key={option}
            variant={value === option ? "secondary" : "outline"}
            label={choiceLabel(option, language)}
            accessibilityLabel={`${label}: ${choiceLabel(option, language)}`}
            accessibilityState={{ selected: value === option }}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}

export function OnboardingFields({
  flow,
  step,
  t,
  language,
  busy,
  clubQuery,
  setClubQuery,
  clubs,
  setClubs,
  change,
  run,
  continueFlow,
  goTo,
  refresh,
}: Props) {
  const draft = flow.draft;
  switch (step) {
    case "intention":
      return (
        <View style={{ gap: theme.spacing[3] }}>
          {(["player", "organization", "invitation"] as const).map((path) => (
            <Button
              key={path}
              label={t(
                path === "player"
                  ? "playerPath"
                  : path === "organization"
                    ? "organizationPath"
                    : "invitationPath",
              )}
              loading={busy}
              variant={path === draft.path ? "primary" : "outline"}
              onPress={() =>
                void run(async () => {
                  await change({ path });
                  await goTo(STEPS_BY_PATH[path][1]);
                })
              }
            />
          ))}
        </View>
      );
    case "organization":
      return (
        <Input
          label={t("orgName")}
          value={draft.organizationName}
          maxLength={120}
          onChangeText={(organizationName) => void change({ organizationName })}
        />
      );
    case "competition":
      return (
        <View style={{ gap: theme.spacing[4] }}>
          <Input
            label={t("competitionName")}
            value={draft.competition.name ?? ""}
            maxLength={120}
            onChangeText={(name) => void change({ competition: { name } })}
          />
          <Input
            label={t("edition")}
            value={draft.competition.gameEdition ?? ""}
            maxLength={40}
            onChangeText={(gameEdition) => void change({ competition: { gameEdition } })}
          />
          <ChoiceGroup<GamePlatformDto>
            language={language}
            label={t("platform")}
            values={gamePlatformSchema.options}
            value={draft.competition.platform}
            onSelect={(platform) => void change({ competition: { platform } })}
          />
          <ChoiceGroup<CompetitionRegionDto>
            language={language}
            label={t("region")}
            values={REGIONS}
            value={draft.competition.region}
            onSelect={(region) => void change({ competition: { region } })}
          />
          <Input
            label={t("timezone")}
            value={draft.competition.timeZone ?? ""}
            onChangeText={(timeZone) => void change({ competition: { timeZone } })}
          />
          <ChoiceGroup<CompetitionFormatDto>
            language={language}
            label={t("format")}
            values={FORMATS}
            value={draft.competition.format}
            onSelect={(format) => void change({ competition: { format } })}
          />
        </View>
      );
    case "invitation":
      return (
        <View style={{ gap: theme.spacing[3] }}>
          <Input
            label={t("invitationToken")}
            value={draft.invitationToken}
            autoCapitalize="none"
            onChangeText={(invitationToken) => void change({ invitationToken })}
          />
          <Button
            variant="outline"
            label={t("inspect")}
            loading={busy}
            onPress={() =>
              void run(async () => {
                await flow.inspectInvitation();
                refresh();
              })
            }
          />
          {flow.preview ? (
            <Text role="body">
              {flow.preview.organizationName} · {flow.preview.competitionName} ·{" "}
              {flow.preview.competitionRole}\n{t("expires")}:{" "}
              {new Date(flow.preview.expiresAt).toLocaleDateString(language)}
            </Text>
          ) : null}
        </View>
      );
    case "game-account":
      return (
        <View style={{ gap: theme.spacing[3] }}>
          <Text color="muted-foreground">{t("optionalAccount")}</Text>
          <Input
            label={t("identifier")}
            value={draft.gameAccount.identifier ?? ""}
            onChangeText={(identifier) => void change({ gameAccount: { identifier } })}
          />
          <ChoiceGroup<GamePlatformDto>
            language={language}
            label={t("platform")}
            values={gamePlatformSchema.options}
            value={draft.gameAccount.platform}
            onSelect={(platform) => void change({ gameAccount: { platform } })}
          />
          <Input
            label={t("edition")}
            value={draft.gameAccount.gameEdition ?? ""}
            onChangeText={(gameEdition) => void change({ gameAccount: { gameEdition } })}
          />
          <Button
            variant="ghost"
            label={t("skip")}
            onPress={() =>
              void run(async () => {
                await change({ gameAccount: {} });
                await continueFlow();
              })
            }
          />
        </View>
      );
    case "club":
      return (
        <View style={{ gap: theme.spacing[3] }}>
          <Input label={t("clubSearch")} value={clubQuery} onChangeText={setClubQuery} />
          <Button
            variant="outline"
            label={t("search")}
            loading={busy}
            onPress={() =>
              void run(async () => {
                setClubs(await flow.searchClubs(clubQuery));
              })
            }
          />
          {clubs.length === 0 && clubQuery ? (
            <Text role="caption" color="muted-foreground">
              {t("noClubs")}
            </Text>
          ) : null}
          {clubs.map((club) => (
            <Button
              key={`${club.providerKey}:${club.externalClubId}`}
              variant={draft.club?.externalClubId === club.externalClubId ? "secondary" : "outline"}
              label={`${club.name} · ${t("selectClub")}`}
              onPress={() => void change({ club })}
            />
          ))}
          {draft.club ? (
            <Text>
              {t("selected")}: {draft.club.name}
            </Text>
          ) : null}
          {draft.club ? (
            <Button
              variant="ghost"
              label={t("removeClub")}
              onPress={() => void change({ club: null })}
            />
          ) : null}
          <Button
            variant="ghost"
            label={t("skip")}
            onPress={() =>
              void run(async () => {
                await change({ club: null });
                await continueFlow();
              })
            }
          />
        </View>
      );
    case "review":
      return (
        <View style={{ gap: theme.spacing[3] }}>
          <Text>
            {draft.path === "player"
              ? t("playerPath")
              : draft.path === "organization"
                ? t("organizationPath")
                : t("invitationPath")}
          </Text>
          {draft.organizationName ? (
            <Text>
              {t("orgName")}: {draft.organizationName}
            </Text>
          ) : null}
          {draft.competition.name ? (
            <Text>
              {t("competitionName")}: {draft.competition.name}
            </Text>
          ) : null}
          {draft.path === "invitation" ? <Text>{t("invitationToken")}: ••••</Text> : null}
          {draft.path === "invitation" && !flow.preview ? (
            <Button
              variant="outline"
              label={t("inspect")}
              loading={busy}
              onPress={() =>
                void run(async () => {
                  await flow.inspectInvitation();
                  refresh();
                })
              }
            />
          ) : null}
          {draft.path === "invitation" && flow.preview ? (
            <Text>
              {flow.preview.organizationName} · {flow.preview.competitionName}
            </Text>
          ) : null}
          {draft.gameAccount.identifier ? (
            <Text>
              {t("identifier")}: {draft.gameAccount.identifier}
            </Text>
          ) : (
            <Text>{t("optionalAccount")}</Text>
          )}
          {draft.club ? (
            <Text>
              {t("club")}: {draft.club.name}
            </Text>
          ) : null}
          {missingRequiredStep(draft) ? (
            <Text color="danger">
              {t("required")}: {missingRequiredStep(draft)}
            </Text>
          ) : null}
          {stepsForPath(draft.path ?? "player")
            .slice(1, -1)
            .map((editStep) => (
              <Button
                key={editStep}
                variant="ghost"
                label={`${t("edit")} ${t(editTitleKey[editStep])}`}
                onPress={() => void run(() => goTo(editStep))}
              />
            ))}
        </View>
      );
    case "game":
      return null;
  }
}
