import type { PublicCalendarEntryDto, PublicEncounterStatusDto } from "@futrob/api-contracts";
import { CalendarBlankIcon, ClockIcon, SealCheckIcon } from "@phosphor-icons/react";
import { applyStyles, Badge, Caption, Score, Text, vis, type Icon } from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { kickoffLabel, kickoffTimeOnly, scoreLabel, scoreSummary } from "./public-portal-model.ts";
import { sharedStyles } from "./public-portal-shared.styles.ts";

const FORM_SLOTS = 5;

type FormOutcome = "win" | "draw" | "loss";

const FORM_STYLE = {
  win: sharedStyles.formWin,
  draw: sharedStyles.formDraw,
  loss: sharedStyles.formLoss,
} as const satisfies Record<FormOutcome, (typeof sharedStyles)[keyof typeof sharedStyles]>;

export function PortalFormStrip({
  compact = false,
  form,
  narrow = false,
  slots = FORM_SLOTS,
  t,
}: {
  readonly compact?: boolean;
  readonly form: readonly FormOutcome[];
  readonly narrow?: boolean;
  readonly slots?: number;
  readonly t: Translator;
}) {
  const visible = form.slice(-slots);
  const empty = Math.max(0, slots - visible.length);
  return (
    <span {...applyStyles(sharedStyles.form, narrow && sharedStyles.formNarrow)}>
      <span {...applyStyles(vis.srOnly)}>{t("standings.col.form.full")}: </span>
      {visible.map((result, index) => (
        <span
          key={index}
          {...applyStyles(
            sharedStyles.formResult,
            compact && sharedStyles.formCompact,
            FORM_STYLE[result],
            index === visible.length - 1 && sharedStyles.formLatest,
          )}
        >
          <span aria-hidden="true">{t(`standings.form.${result}.short`)}</span>
          <span {...applyStyles(vis.srOnly)}>
            {t(`standings.form.${result}`)}
            {index < visible.length - 1 ? ", " : ""}
          </span>
        </span>
      ))}
      {Array.from({ length: empty }, (_, index) => (
        <span
          aria-hidden="true"
          key={`empty-${index}`}
          {...applyStyles(sharedStyles.formEmpty, compact && sharedStyles.formCompact)}
        />
      ))}
    </span>
  );
}

const ENCOUNTER_STATUS_META = {
  official: {
    label: "portal.encounter.status.official",
    variant: "approved",
    icon: SealCheckIcon,
  },
  awaiting_result: {
    label: "portal.encounter.status.awaiting_result",
    variant: "warning",
    icon: ClockIcon,
  },
  scheduled: {
    label: "portal.encounter.status.scheduled",
    variant: "outline",
    icon: CalendarBlankIcon,
  },
} as const satisfies Record<
  PublicEncounterStatusDto,
  {
    readonly label: ParameterlessMessageKey;
    readonly variant: "approved" | "warning" | "outline";
    readonly icon: Icon;
  }
>;

export function PortalEncounterRow({
  compact = false,
  entry,
  timeOnly = false,
  timeZone,
}: {
  readonly compact?: boolean;
  readonly entry: PublicCalendarEntryDto;
  readonly timeOnly?: boolean;
  readonly timeZone: string;
}) {
  const { locale, t } = useI18n();
  const formattedScore = entry.score ? scoreLabel(entry.score) : null;
  const summary = scoreSummary(entry.score);
  const meta = ENCOUNTER_STATUS_META[entry.status];
  const StatusIcon = meta.icon;
  const crest = applyStyles(sharedStyles.crest);

  return (
    <li {...applyStyles(sharedStyles.listItem)}>
      <article
        aria-label={t("portal.encounter.label", {
          home: entry.homeTeamName,
          away: entry.awayTeamName,
        })}
        {...applyStyles(sharedStyles.row, compact && sharedStyles.rowCompact)}
      >
        <Caption className={[sharedStyles.when, compact && sharedStyles.whenCompact]}>
          <time dateTime={entry.scheduledStartAt}>
            {timeOnly
              ? kickoffTimeOnly(entry.scheduledStartAt, timeZone, locale)
              : kickoffLabel(entry.scheduledStartAt, timeZone, locale)}
          </time>
        </Caption>
        <div {...applyStyles(sharedStyles.matchup)}>
          <div {...applyStyles(sharedStyles.sideHome)}>
            <Text className={sharedStyles.teamName} weight="semibold">
              {entry.homeTeamName}
            </Text>
            <ClubCrestAvatar
              className={crest.className}
              imageUrl={null}
              name={entry.homeTeamName}
              style={crest.style}
            />
          </div>
          <div {...applyStyles(sharedStyles.centerPill)}>
            {formattedScore && summary ? (
              <Score
                aria-label={t("portal.encounter.score", { score: formattedScore })}
                as="span"
                size="table"
              >
                <span {...applyStyles(vis.srOnly)}>{formattedScore}</span>
                <span aria-hidden="true">
                  {summary.legs.map((leg, index) => (
                    <span key={index}>
                      {index > 0 ? <span {...applyStyles(sharedStyles.scoreDash)}> · </span> : null}
                      <span
                        {...applyStyles(leg.homeGoals > leg.awayGoals && sharedStyles.scoreLead)}
                      >
                        {leg.homeGoals}
                      </span>
                      <span {...applyStyles(sharedStyles.scoreDash)}>–</span>
                      <span
                        {...applyStyles(leg.awayGoals > leg.homeGoals && sharedStyles.scoreLead)}
                      >
                        {leg.awayGoals}
                      </span>
                    </span>
                  ))}
                </span>
              </Score>
            ) : (
              <Caption as="span" className={sharedStyles.vsText}>
                {t("portal.encounter.versus")}
              </Caption>
            )}
          </div>
          <div {...applyStyles(sharedStyles.sideAway)}>
            <ClubCrestAvatar
              className={crest.className}
              imageUrl={null}
              name={entry.awayTeamName}
              style={crest.style}
            />
            <Text className={sharedStyles.teamName} weight="semibold">
              {entry.awayTeamName}
            </Text>
          </div>
        </div>
        <div {...applyStyles(sharedStyles.statusCell)}>
          <Badge variant={meta.variant}>
            <StatusIcon aria-hidden="true" {...applyStyles(sharedStyles.statusIcon)} />
            {t(meta.label)}
          </Badge>
        </div>
      </article>
    </li>
  );
}

export function PortalEncounterList({
  bare = false,
  compact = false,
  entries,
  timeOnly = false,
  timeZone,
}: {
  readonly bare?: boolean;
  readonly compact?: boolean;
  readonly entries: readonly PublicCalendarEntryDto[];
  readonly timeOnly?: boolean;
  readonly timeZone: string;
}) {
  return (
    <ul {...applyStyles(bare ? sharedStyles.listBare : sharedStyles.list)}>
      {entries.map((entry) => (
        <PortalEncounterRow
          compact={compact}
          entry={entry}
          key={`${entry.roundNumber}:${entry.scheduledStartAt}:${entry.homeTeamName}:${entry.awayTeamName}`}
          timeOnly={timeOnly}
          timeZone={timeZone}
        />
      ))}
    </ul>
  );
}
