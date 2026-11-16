import { useReducer } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import {
  EMPTY_TEAM_DRAFT,
  previewEncounter,
  teamDraftReducer,
  type EncounterPreview,
  type OfficialSlot,
  type TeamScore,
} from "@futrob/sdk";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { useMobileCopy, type MobileLanguage } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { theme } from "@/theme/theme";
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text } from "@/ui";
import {
  formatInCompetitionZone,
  matchCenterCopy,
  type MatchCenterCopy,
} from "./match-center-copy";
import { outcomeText, SectionHeading } from "./match-center-parts";
import { CandidatesSection } from "./candidates-section";
import { ReviewSection } from "./review-section";
import { TeamSelectionSection } from "./team-selection-section";
import { useMatchCenter, type CandidatesState } from "./use-match-center";

type RouteParams = {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly encounterId: string;
};

/**
 * `/orgs/:orgId/competitions/:competitionId/encounters/:encounterId`, same path as web's
 * Encounter page: the Encounter, its EA candidates and the official selection. The Team panel
 * (propose, confirm, reject, alternative, dispute) and the organization review appear only
 * where `EffectiveAccess` allows them; the API authorizes every command again.
 */
export function MatchCenterScreen(params: RouteParams) {
  return (
    <GateBoundary mode="ready">
      <MatchCenterContent {...params} />
    </GateBoundary>
  );
}

function MatchCenterContent(params: RouteParams) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = matchCenterCopy(language);
  const state = useMatchCenter(params);
  const [draft, dispatch] = useReducer(teamDraftReducer, EMPTY_TEAM_DRAFT);
  const competitionRoute = `/orgs/${encodeURIComponent(params.organizationId)}/competitions/${encodeURIComponent(params.competitionId)}`;
  const { encounter } = state;

  return (
    <Screen scroll centered={false}>
      <View style={{ gap: theme.spacing[6], maxWidth: 560, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "flex-start" }}>
          <Button
            variant="ghost"
            label={copy.back}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace(nativeRoute(competitionRoute))
            }
          />
        </View>
        {encounter.kind === "loading" ? <LoadingState label={copy.loading} /> : null}
        {encounter.kind === "not_found" ? (
          <EmptyState title={copy.notFoundTitle} description={copy.notFoundDescription} />
        ) : null}
        {encounter.kind === "error" ? (
          <ErrorState
            title={copy.error}
            retryLabel={copy.retry}
            onRetry={encounter.retry}
            retrying={encounter.retrying}
          />
        ) : null}
        {encounter.kind === "ready" ? (
          <ReadyEncounter
            view={encounter.view}
            candidates={state.candidates}
            copy={copy}
            language={language}
            draft={draft}
            dispatch={dispatch}
            team={state.team}
            review={state.review}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function ReadyEncounter({
  view,
  candidates,
  copy,
  language,
  draft,
  dispatch,
  team,
  review,
}: {
  readonly view: EncounterViewDto;
  readonly candidates: CandidatesState;
  readonly copy: MatchCenterCopy;
  readonly language: MobileLanguage;
  readonly draft: Parameters<typeof TeamSelectionSection>[0]["draft"];
  readonly dispatch: Parameters<typeof TeamSelectionSection>[0]["dispatch"];
  readonly team: Parameters<typeof TeamSelectionSection>[0]["state"];
  readonly review: Parameters<typeof ReviewSection>[0]["state"];
}) {
  const listed = listedCandidates(candidates);
  const { assignments } = draft.input;
  const preview = previewEncounter(view, listed, assignments);
  const at = (iso: string) => formatInCompetitionZone(iso, view.competition.timeZone, language);
  const shared = { view, copy, language, candidates: listed, at };

  return (
    <>
      <EncounterHeader view={view} copy={copy} at={at} />
      <SlotsSection
        view={view}
        copy={copy}
        preview={preview}
        at={at}
        onClear={(slot) => dispatch({ type: "clear_slot", slot })}
      />
      <CandidatesSection
        state={candidates}
        view={view}
        copy={copy}
        language={language}
        at={at}
        assignments={assignments}
        onAssign={(slot, key) => dispatch({ type: "assign", slot, key })}
      />
      <TeamSelectionSection
        {...shared}
        state={team}
        draft={draft}
        dispatch={dispatch}
        preview={preview}
      />
      <ReviewSection {...shared} state={review} />
    </>
  );
}

function listedCandidates(state: CandidatesState): readonly EncounterCandidateDto[] {
  return state.kind === "ready" && state.data.status === "ready" ? state.data.candidates : [];
}

function EncounterHeader({
  view,
  copy,
  at,
}: {
  readonly view: EncounterViewDto;
  readonly copy: MatchCenterCopy;
  readonly at: (iso: string) => string;
}) {
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <Text role="caption" color="muted-foreground">
        {view.round
          ? `${view.competition.name} · ${copy.round(view.round.number, view.round.total)}`
          : view.competition.name}
      </Text>
      <Text role="heading" accessibilityRole="header">
        {`${view.home.name} ${copy.vs} ${view.away.name}`}
      </Text>
      <Text>{at(view.scheduledStartAt)}</Text>
      <Text role="caption" color="muted-foreground">
        {copy.timeZone(view.competition.timeZone)}
      </Text>
    </View>
  );
}

function scoreLine(view: EncounterViewDto, score: TeamScore) {
  return `${view.home.name} ${score.home}–${score.away} ${view.away.name}`;
}

function SlotsSection({
  view,
  copy,
  preview,
  at,
  onClear,
}: {
  readonly view: EncounterViewDto;
  readonly copy: MatchCenterCopy;
  readonly preview: EncounterPreview;
  readonly at: (iso: string) => string;
  readonly onClear: (slot: OfficialSlot) => void;
}) {
  const { series } = preview;
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <SectionHeading title={copy.slotsTitle} description={copy.slotsDescription} />
      {preview.slots.map((slot) => {
        const kickoff = view.officialMatches.find((match) => match.officialSlot === slot.slot);
        return (
          <Card key={slot.slot}>
            <View style={{ gap: theme.spacing[1] }}>
              <Text role="label">{copy.slot(slot.slot)}</Text>
              {kickoff ? (
                <Text role="caption" color="muted-foreground">
                  {at(kickoff.scheduledStartAt)}
                </Text>
              ) : null}
              {slot.kind === "unassigned" ? (
                <Text color="muted-foreground">{copy.slotUnassigned}</Text>
              ) : null}
              {slot.kind === "unmatched" ? <Text color="warning">{copy.slotUnmatched}</Text> : null}
              {slot.kind === "scored" ? (
                <>
                  <Text role="score">{scoreLine(view, slot.score)}</Text>
                  <Text role="caption" color="muted-foreground">
                    {outcomeText(slot.outcome, view, copy)}
                  </Text>
                </>
              ) : null}
            </View>
            {slot.kind === "unassigned" ? null : (
              <Button
                variant="ghost"
                label={copy.slotClear(slot.slot)}
                onPress={() => onClear(slot.slot)}
              />
            )}
          </Card>
        );
      })}
      <View accessibilityLiveRegion="polite" style={{ gap: theme.spacing[1] }}>
        {series.kind === "incomplete" ? (
          <Text role="caption" color="muted-foreground">
            {copy.previewIncomplete}
          </Text>
        ) : null}
        {series.kind === "single" ? (
          <Text role="label">{`${copy.previewResult}: ${outcomeText(series.outcome, view, copy)}`}</Text>
        ) : null}
        {series.kind === "aggregate" ? (
          <Text role="label">
            {`${copy.previewAggregate}: ${scoreLine(view, series.total)} · ${outcomeText(series.outcome, view, copy)}`}
          </Text>
        ) : null}
        {series.kind === "independent" ? (
          <Text role="caption" color="muted-foreground">
            {copy.previewIndependent}
          </Text>
        ) : null}
        {series.kind === "mode_unknown" ? (
          <Text role="caption" color="muted-foreground">
            {copy.previewModeUnknown}
          </Text>
        ) : null}
        <Text role="caption" color="muted-foreground">
          {copy.previewNote}
        </Text>
      </View>
    </View>
  );
}
