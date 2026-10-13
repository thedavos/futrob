import type { ReactNode } from "react";
import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Caption,
  Heading,
  Score,
  SectionTitle,
  Skeleton,
  Text,
} from "@futrob/ui";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  InfoIcon,
  LinkBreakIcon,
  LockIcon,
  SoccerBallIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { CandidatesState } from "./encounter-page.tsx";
import {
  candidateKey,
  slotOf,
  type OfficialSlot,
  type SlotAssignments,
} from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import { RetryAlert, type Formats } from "./encounter-parts.tsx";

export function CandidatesSection({
  assignments,
  formats,
  onAssign,
  state,
  t,
  view,
}: {
  readonly assignments: SlotAssignments;
  readonly formats: Formats;
  readonly onAssign: (slot: OfficialSlot, key: string) => void;
  readonly state: CandidatesState;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  return (
    <section aria-labelledby="encounter-candidates" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <div {...applyStyles(styles.sectionCopy)}>
          <SectionTitle id="encounter-candidates">{t("encounter.candidates.title")}</SectionTitle>
          <Caption>{t("encounter.candidates.description")}</Caption>
          {state.kind === "ready" ? (
            <Caption>
              {t("encounter.candidates.updated", {
                time: formats.clock.format(new Date(state.updatedAt)),
              })}
            </Caption>
          ) : null}
        </div>
        {state.kind === "ready" ? (
          <Button disabled={state.refreshing} onClick={state.refresh} variant="outline">
            <ArrowsClockwiseIcon aria-hidden="true" />
            {state.refreshing
              ? t("encounter.candidates.refreshing")
              : t("encounter.candidates.refresh")}
          </Button>
        ) : null}
      </div>
      {state.kind === "ready" && state.refreshFailed ? (
        <Alert variant="warning">
          <AlertDescription>{t("encounter.candidates.refreshFailed")}</AlertDescription>
        </Alert>
      ) : null}
      <CandidatesBody
        assignments={assignments}
        formats={formats}
        onAssign={onAssign}
        state={state}
        t={t}
        view={view}
      />
    </section>
  );
}

function CandidatesBody({
  assignments,
  formats,
  onAssign,
  state,
  t,
  view,
}: {
  readonly assignments: SlotAssignments;
  readonly formats: Formats;
  readonly onAssign: (slot: OfficialSlot, key: string) => void;
  readonly state: CandidatesState;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  switch (state.kind) {
    case "loading":
      return (
        <div aria-busy="true" {...applyStyles(styles.list)}>
          <Skeleton {...applyStyles(styles.skeletonRow)} />
          <Skeleton {...applyStyles(styles.skeletonRow)} />
        </div>
      );
    case "forbidden":
      return (
        <Notice
          description={t("encounter.candidates.forbidden.description")}
          icon={<LockIcon aria-hidden="true" size={24} />}
          title={t("encounter.candidates.forbidden.title")}
        />
      );
    case "error":
      return <RetryAlert message={t("encounter.candidates.error")} retry={state.retry} t={t} />;
    case "ready":
      break;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }

  const data = state.data;
  switch (data.status) {
    case "clubs_not_connected":
      return (
        <Notice
          description={t("encounter.candidates.notConnected.description")}
          icon={<LinkBreakIcon aria-hidden="true" size={24} />}
          title={t("encounter.candidates.notConnected.title")}
        >
          {data.sides.map((side) => (
            <Text key={side} tone="default" weight="medium">
              {t("encounter.candidates.notConnected.side", { team: view[side].name })}
            </Text>
          ))}
        </Notice>
      );
    case "provider_mismatch":
      return (
        <Notice
          description={t("encounter.candidates.providerMismatch.description")}
          icon={<LinkBreakIcon aria-hidden="true" size={24} />}
          title={t("encounter.candidates.providerMismatch.title")}
        />
      );
    case "ready":
      if (data.candidates.length === 0) {
        return (
          <Notice
            description={t("encounter.candidates.empty.description")}
            icon={<SoccerBallIcon aria-hidden="true" size={24} />}
            title={t("encounter.candidates.empty.title")}
          />
        );
      }
      return (
        <>
          <Caption>
            {t("encounter.candidates.window", {
              from: formats.kickoff.format(new Date(data.window.from)),
              to: formats.kickoff.format(new Date(data.window.to)),
            })}
          </Caption>
          <ul aria-label={t("encounter.candidates.list")} {...applyStyles(styles.list)}>
            {data.candidates.map((candidate) => (
              <CandidateRow
                assignedSlot={slotOf(assignments, candidateKey(candidate))}
                candidate={candidate}
                formats={formats}
                key={candidateKey(candidate)}
                onAssign={(slot) => onAssign(slot, candidateKey(candidate))}
                slots={view.officialMatches.map((match) => match.officialSlot)}
                t={t}
              />
            ))}
          </ul>
        </>
      );
    default: {
      const exhaustive: never = data;
      return exhaustive;
    }
  }
}

function CandidateRow({
  assignedSlot,
  candidate,
  formats,
  onAssign,
  slots,
  t,
}: {
  readonly assignedSlot: OfficialSlot | null;
  readonly candidate: EncounterCandidateDto;
  readonly formats: Formats;
  readonly onAssign: (slot: OfficialSlot) => void;
  readonly slots: readonly OfficialSlot[];
  readonly t: Translator;
}) {
  const playedAt = formats.kickoff.format(new Date(candidate.occurredAt));
  const { metadata } = candidate;
  return (
    <li
      aria-label={t("encounter.candidate.label", {
        home: candidate.home.name,
        away: candidate.away.name,
        time: playedAt,
      })}
      {...applyStyles(styles.row, assignedSlot !== null && styles.rowSelected)}
    >
      <div {...applyStyles(styles.rowTop)}>
        <Caption as="span">
          <time dateTime={candidate.occurredAt}>{playedAt}</time>
        </Caption>
        <Text look="caption" weight="semibold" className={styles.status}>
          {assignedSlot === null ? (
            t("encounter.candidate.unused")
          ) : (
            <>
              <CheckIcon aria-hidden="true" />
              {t("encounter.candidate.usedIn", { slot: assignedSlot })}
            </>
          )}
        </Text>
      </div>
      <div {...applyStyles(styles.scoreLine)}>
        <Text tone="default" weight="semibold" className={styles.scoreHome}>
          {candidate.home.name}
        </Text>
        <span {...applyStyles(styles.scorePill)}>
          <Score as="span">{`${candidate.home.goals}–${candidate.away.goals}`}</Score>
        </span>
        <Text tone="default" weight="semibold" className={styles.scoreAway}>
          {candidate.away.name}
        </Text>
      </div>
      <div {...applyStyles(styles.inline)}>
        <Caption as="span">
          {metadata.durationSeconds === null
            ? t("encounter.candidate.durationUnknown")
            : t("encounter.candidate.duration", {
                minutes: Math.round(metadata.durationSeconds / 60),
              })}
        </Caption>
        <Caption as="span">
          {t("encounter.candidate.players", { count: candidate.playerObservationCount })}
        </Caption>
        {metadata.wasDisconnected ? (
          <Badge variant="warning">
            <WarningIcon aria-hidden="true" />
            {t("encounter.candidate.disconnected")}
          </Badge>
        ) : null}
        {metadata.winnerByForfeit ? (
          <Badge variant="warning">
            <WarningIcon aria-hidden="true" />
            {t("encounter.candidate.forfeit")}
          </Badge>
        ) : null}
        {metadata.completeness === "complete" ? null : (
          <Badge variant="neutral">
            <InfoIcon aria-hidden="true" />
            {metadata.completeness === "partial"
              ? t("encounter.candidate.partial")
              : t("encounter.candidate.unverified")}
          </Badge>
        )}
      </div>
      <div {...applyStyles(styles.actions)}>
        {slots.map((slot) => {
          const pressed = assignedSlot === slot;
          return (
            <Button
              aria-pressed={pressed}
              key={slot}
              onClick={() => onAssign(slot)}
              variant={pressed ? "secondary" : "outline"}
            >
              {pressed ? <CheckIcon aria-hidden="true" /> : null}
              {t("encounter.candidate.useIn", { slot })}
            </Button>
          );
        })}
      </div>
    </li>
  );
}

function Notice({
  children,
  description,
  icon,
  title,
}: {
  readonly children?: ReactNode;
  readonly description: string;
  readonly icon: ReactNode;
  readonly title: string;
}) {
  return (
    <div {...applyStyles(styles.notice)}>
      <span {...applyStyles(styles.noticeIcon)}>{icon}</span>
      <div {...applyStyles(styles.noticeCopy)}>
        <Heading as="h3">{title}</Heading>
        {children}
        <Caption>{description}</Caption>
      </div>
    </div>
  );
}
