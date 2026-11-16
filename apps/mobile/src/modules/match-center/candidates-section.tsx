import { View } from "react-native";
import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import { candidateKey, slotOf, type OfficialSlot, type SlotAssignments } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { theme } from "@/theme/theme";
import { Button, Card, EmptyState, ErrorState, LoadingState, Text } from "@/ui";
import { formatClock, type MatchCenterCopy } from "./match-center-copy";
import { SectionHeading } from "./match-center-parts";
import type { CandidatesState } from "./use-match-center";

/**
 * EA matches between both Teams' clubs near the kickoff. Choosing one for an official slot is
 * a local draft: it previews the score and feeds a proposal, and sends nothing on its own.
 */
export function CandidatesSection({
  state,
  view,
  copy,
  language,
  at,
  assignments,
  onAssign,
}: {
  readonly state: CandidatesState;
  readonly view: EncounterViewDto;
  readonly copy: MatchCenterCopy;
  readonly language: MobileLanguage;
  readonly at: (iso: string) => string;
  readonly assignments: SlotAssignments;
  readonly onAssign: (slot: OfficialSlot, key: string) => void;
}) {
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <SectionHeading title={copy.candidatesTitle} description={copy.candidatesDescription} />
      {state.kind === "ready" ? (
        <>
          <Text role="caption" color="muted-foreground">
            {copy.candidatesUpdated(formatClock(state.updatedAt, language))}
          </Text>
          <Button
            variant="outline"
            label={copy.candidatesRefresh}
            loading={state.refreshing}
            onPress={state.refresh}
          />
          {state.refreshFailed ? (
            <Text color="warning" accessibilityLiveRegion="polite">
              {copy.candidatesRefreshFailed}
            </Text>
          ) : null}
        </>
      ) : null}
      {state.kind === "loading" ? <LoadingState label={copy.candidatesTitle} rows={2} /> : null}
      {state.kind === "forbidden" ? (
        <EmptyState
          title={copy.candidatesForbiddenTitle}
          description={copy.candidatesForbiddenDescription}
        />
      ) : null}
      {state.kind === "error" ? (
        <ErrorState
          title={copy.candidatesError}
          retryLabel={copy.retry}
          onRetry={state.retry}
          retrying={state.retrying}
        />
      ) : null}
      {state.kind === "ready" && state.data.status === "clubs_not_connected" ? (
        <EmptyState
          title={copy.notConnectedTitle}
          description={copy.notConnectedDescription}
          action={state.data.sides.map((side) => (
            <Text key={side} style={{ textAlign: "center" }}>
              {copy.notConnectedSide(view[side].name)}
            </Text>
          ))}
        />
      ) : null}
      {state.kind === "ready" && state.data.status === "provider_mismatch" ? (
        <EmptyState
          title={copy.providerMismatchTitle}
          description={copy.providerMismatchDescription}
        />
      ) : null}
      {state.kind === "ready" && state.data.status === "ready" ? (
        state.data.candidates.length === 0 ? (
          <EmptyState
            title={copy.candidatesEmptyTitle}
            description={copy.candidatesEmptyDescription}
          />
        ) : (
          <>
            <Text role="caption" color="muted-foreground">
              {copy.candidatesWindow(at(state.data.window.from), at(state.data.window.to))}
            </Text>
            {state.data.candidates.map((candidate) => (
              <CandidateCard
                key={candidateKey(candidate)}
                candidate={candidate}
                copy={copy}
                at={at}
                slots={view.officialMatches.map((match) => match.officialSlot)}
                assignedSlot={slotOf(assignments, candidateKey(candidate))}
                onAssign={(slot) => onAssign(slot, candidateKey(candidate))}
              />
            ))}
          </>
        )
      ) : null}
    </View>
  );
}

function CandidateCard({
  candidate,
  copy,
  at,
  slots,
  assignedSlot,
  onAssign,
}: {
  readonly candidate: EncounterCandidateDto;
  readonly copy: MatchCenterCopy;
  readonly at: (iso: string) => string;
  readonly slots: readonly OfficialSlot[];
  readonly assignedSlot: OfficialSlot | null;
  readonly onAssign: (slot: OfficialSlot) => void;
}) {
  const playedAt = at(candidate.occurredAt);
  const { metadata } = candidate;
  const badges = [
    metadata.wasDisconnected ? copy.candidateDisconnected : null,
    metadata.winnerByForfeit ? copy.candidateForfeit : null,
    metadata.completeness === "partial" ? copy.candidatePartial : null,
    metadata.completeness === "unknown" ? copy.candidateUnverified : null,
  ].filter((badge): badge is string => badge !== null);
  return (
    <Card
      accessibilityLabel={copy.candidateLabel(candidate.home.name, candidate.away.name, playedAt)}
      style={assignedSlot === null ? undefined : { borderColor: theme.colors.primary }}
    >
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.spacing[2] }}
      >
        <Text role="caption" color="muted-foreground">
          {playedAt}
        </Text>
        <Text role="caption" color={assignedSlot === null ? "muted-foreground" : "primary"}>
          {assignedSlot === null ? copy.candidateUnused : copy.candidateUsedIn(assignedSlot)}
        </Text>
      </View>
      <Text role="score">
        {`${candidate.home.name} ${candidate.home.goals}–${candidate.away.goals} ${candidate.away.name}`}
      </Text>
      <Text role="caption" color="muted-foreground">
        {[
          metadata.durationSeconds === null
            ? copy.candidateDurationUnknown
            : copy.candidateDuration(Math.round(metadata.durationSeconds / 60)),
          copy.candidatePlayers(candidate.playerObservationCount),
        ].join(" · ")}
      </Text>
      {badges.map((badge) => (
        <Text key={badge} role="caption" color="warning">
          {badge}
        </Text>
      ))}
      <View style={{ gap: theme.spacing[2] }}>
        {slots.map((slot) => {
          const pressed = assignedSlot === slot;
          return (
            <Button
              key={slot}
              variant={pressed ? "secondary" : "outline"}
              label={pressed ? copy.candidateUsedIn(slot) : copy.candidateUseIn(slot)}
              accessibilityLabel={copy.candidateUseIn(slot)}
              accessibilityState={{ selected: pressed }}
              onPress={() => onAssign(slot)}
            />
          );
        })}
      </View>
    </Card>
  );
}
