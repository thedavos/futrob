import { useId } from "react";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Heading,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Text,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { fixtureStageLabel } from "../competition-fixture-labels.ts";
import { BracketCanvas } from "./bracket-canvas.tsx";
import { BracketList } from "./bracket-list.tsx";
import {
  bracketTeamOptions,
  matchesTeam,
  type BracketTeamOption,
  type BracketView,
} from "./bracket-model.ts";
import type { Formatters, Scope, StageProps, TeamFilter } from "./bracket-page-shared.ts";
import { styles } from "./bracket-page.styles.ts";

const ALL_TEAMS = "all";

type ContentProps = TeamFilter & {
  readonly bracket: BracketView;
  readonly locale: string;
  readonly refreshFailed: boolean;
  readonly retry: () => void;
  readonly scope: Scope;
  readonly t: Translator;
};

export function BracketContent({
  bracket,
  locale,
  onTeamChange,
  refreshFailed,
  retry,
  scope,
  t,
  teamId,
}: ContentProps) {
  const options = bracketTeamOptions(bracket, locale);
  // A Team from an old link that the draw no longer places highlights nothing; ignore it.
  const activeTeam = options.find((option) => option.teamId === teamId) ?? null;
  const formatters: Formatters = {
    kickoff: new Intl.DateTimeFormat(locale, {
      timeZone: bracket.timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    day: new Intl.DateTimeFormat(locale, {
      timeZone: bracket.timeZone,
      day: "numeric",
      month: "short",
    }),
  };
  const nodes = bracket.stages.flatMap((stage) => stage.nodes);
  const highlighted = nodes.filter((node) =>
    matchesTeam(node.encounter, activeTeam?.teamId ?? null),
  ).length;

  return (
    <div {...applyStyles(styles.stack)}>
      {refreshFailed ? (
        <RetryAlert message={t("bracket.refreshError")} retry={retry} t={t} />
      ) : null}
      <div {...applyStyles(styles.toolbar)}>
        <Caption as="p">{t("fixture.timeZone", { zone: bracket.timeZone })}</Caption>
        {options.length > 1 ? (
          <TeamSelect active={activeTeam} onTeamChange={onTeamChange} options={options} t={t} />
        ) : null}
      </div>
      {activeTeam ? (
        <div {...applyStyles(styles.filterSummary)}>
          <Text aria-live="polite" as="p" look="caption" tone="muted">
            {t("bracket.filter.summary", { shown: highlighted, total: nodes.length })}
          </Text>
          <Button onClick={() => onTeamChange(null)} variant="ghost">
            {t("bracket.filter.clear")}
          </Button>
        </div>
      ) : null}
      {bracket.stages.map((stage) => (
        <BracketStage
          key={stage.id}
          formatters={formatters}
          scope={scope}
          stage={stage}
          t={t}
          teamId={activeTeam?.teamId ?? null}
        />
      ))}
    </div>
  );
}

function TeamSelect({
  active,
  onTeamChange,
  options,
  t,
}: {
  readonly active: BracketTeamOption | null;
  readonly onTeamChange: (teamId: string | null) => void;
  readonly options: readonly BracketTeamOption[];
  readonly t: Translator;
}) {
  const id = useId();
  const allLabel = t("bracket.filter.allTeams");
  return (
    <div {...applyStyles(styles.filter)}>
      <Label htmlFor={id}>{t("bracket.filter.team")}</Label>
      <Select
        items={[
          { label: allLabel, value: ALL_TEAMS },
          ...options.map((option) => ({ label: option.name, value: option.teamId })),
        ]}
        onValueChange={(value) => onTeamChange(!value || value === ALL_TEAMS ? null : value)}
        value={active?.teamId ?? ALL_TEAMS}
      >
        <SelectTrigger className={styles.filterTrigger} id={id}>
          {active?.name ?? allLabel}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TEAMS}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.teamId} value={option.teamId}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BracketStage({ formatters, scope, stage, t, teamId }: StageProps) {
  const headingId = useId();
  const hintId = useId();
  const stageLabel = fixtureStageLabel(stage.kind, t);
  const rounds = stage.columns.length;
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.stage)}>
      <div {...applyStyles(styles.stageHeader)}>
        <Heading as="h2" id={headingId}>
          {stageLabel}
        </Heading>
        <ul aria-label={t("bracket.facts")} {...applyStyles(styles.facts)}>
          <li>
            <Badge>
              {rounds === 1
                ? t("bracket.rounds.one")
                : t("bracket.rounds.other", { count: rounds })}
            </Badge>
          </li>
          <li>
            <Badge>
              {stage.encounterCount === 1
                ? t("bracket.encounters.one")
                : t("bracket.encounters.other", { count: stage.encounterCount })}
            </Badge>
          </li>
          {stage.byeCount > 0 ? (
            <li>
              <Badge>
                {stage.byeCount === 1
                  ? t("bracket.byes.one")
                  : t("bracket.byes.other", { count: stage.byeCount })}
              </Badge>
            </li>
          ) : null}
          {stage.twoLegCount > 0 ? (
            <li>
              <Badge>{t("bracket.twoLegs")}</Badge>
            </li>
          ) : null}
        </ul>
      </div>
      <Caption as="p" id={hintId}>
        {t("bracket.hint")}
      </Caption>
      {stage.unlinkedWinnerCount > 0 ? (
        <Caption as="p">
          {stage.unlinkedWinnerCount === 1
            ? t("bracket.unlinked.one")
            : t("bracket.unlinked.other", { count: stage.unlinkedWinnerCount })}
        </Caption>
      ) : null}
      {/* Keyboard users scroll the draw by focusing it; every card inside is a link too. */}
      <div
        aria-describedby={hintId}
        aria-label={t("bracket.canvasLabel", { stage: stageLabel })}
        role="region"
        tabIndex={0}
        {...applyStyles(styles.scroller)}
      >
        <BracketCanvas formatters={formatters} scope={scope} stage={stage} t={t} teamId={teamId} />
      </div>
      <BracketList formatters={formatters} scope={scope} stage={stage} t={t} teamId={teamId} />
    </section>
  );
}
