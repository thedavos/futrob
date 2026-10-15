import { useId } from "react";
import type { EncounterViewDto } from "@futrob/api-contracts";
import { applyStyles, Button, Caption, Heading, Text } from "@futrob/ui";
import { InfoIcon, SoccerBallIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { ScoreOutcome, SeriesPreview, SlotPreview } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import { TeamScoreLine, type Formats } from "./encounter-parts.tsx";

export function OfficialSlotRow({
  formats,
  onClear,
  preview,
  t,
  view,
}: {
  readonly formats: Formats;
  readonly onClear: () => void;
  readonly preview: SlotPreview;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  const startsAt = view.officialMatches.find(
    (match) => match.officialSlot === preview.slot,
  )?.scheduledStartAt;
  const label = t("encounter.slot.label", { slot: preview.slot });
  return (
    <li
      aria-label={label}
      {...applyStyles(styles.row, preview.kind !== "unassigned" && styles.rowSelected)}
    >
      <div {...applyStyles(styles.rowTop)}>
        <div {...applyStyles(styles.slotHeading)}>
          <Heading as="h3">{label}</Heading>
          {startsAt ? (
            <Caption as="span">
              <time dateTime={startsAt}>{formats.kickoff.format(new Date(startsAt))}</time>
            </Caption>
          ) : null}
        </div>
        {preview.kind === "unassigned" ? null : (
          <Button
            aria-label={t("encounter.slot.clear", { slot: preview.slot })}
            onClick={onClear}
            size="icon"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        )}
      </div>
      {preview.kind === "unassigned" ? (
        <Caption>{t("encounter.slot.unassigned")}</Caption>
      ) : preview.kind === "unmatched" ? (
        <Text className={[styles.status, styles.warning]}>
          <WarningIcon aria-hidden="true" />
          {t("encounter.slot.unmatched")}
        </Text>
      ) : (
        <>
          <TeamScoreLine score={preview.score} view={view} />
          <OutcomeText outcome={preview.outcome} t={t} view={view} />
        </>
      )}
    </li>
  );
}

export function SeriesPreviewPanel({
  series,
  t,
  view,
}: {
  readonly series: SeriesPreview;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  const id = useId();
  return (
    <div aria-labelledby={id} role="region" {...applyStyles(styles.preview)}>
      <Heading as="h3" id={id}>
        {t("encounter.preview.title")}
      </Heading>
      <SeriesPreviewBody series={series} t={t} view={view} />
      <Caption className={styles.status}>
        <InfoIcon aria-hidden="true" />
        {t("encounter.preview.note")}
      </Caption>
    </div>
  );
}

function SeriesPreviewBody({
  series,
  t,
  view,
}: {
  readonly series: SeriesPreview;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  switch (series.kind) {
    case "incomplete":
      return <Caption>{t("encounter.preview.incomplete")}</Caption>;
    case "independent":
      return <Text>{t("encounter.preview.independent")}</Text>;
    case "mode_unknown":
      return <Text>{t("encounter.preview.modeUnknown")}</Text>;
    case "single":
    case "aggregate": {
      const score = series.kind === "single" ? series.score : series.total;
      const label = t(
        series.kind === "single" ? "encounter.preview.result" : "encounter.preview.aggregate",
      );
      return (
        <div aria-label={label} role="group" {...applyStyles(styles.section)}>
          <Text look="label">{label}</Text>
          <TeamScoreLine score={score} view={view} />
          <OutcomeText outcome={series.outcome} t={t} view={view} />
        </div>
      );
    }
    default: {
      const exhaustive: never = series;
      return exhaustive;
    }
  }
}

function OutcomeText({
  outcome,
  t,
  view,
}: {
  readonly outcome: ScoreOutcome;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  return (
    <Caption className={styles.status}>
      <SoccerBallIcon aria-hidden="true" />
      {outcome === "draw"
        ? t("encounter.outcome.draw")
        : t("encounter.outcome.win", { team: view[outcome].name })}
    </Caption>
  );
}
