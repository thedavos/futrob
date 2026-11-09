import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useRef } from "react";
import { CalendarBlankIcon, ClockIcon, ColumnsIcon, ListBulletsIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import {
  fixtureRoundLabel,
  fixtureSideLabel,
  fixtureStageLabel,
} from "./competition-fixture-labels.ts";
import type { CompetitionFixtureView } from "./competition-fixture-view.ts";
import { monthOf, zonedDateKey } from "./fixture-calendar-dates.ts";
import {
  currentFixtureRoundId,
  defaultFixtureDay,
  filterFixtureEntries,
  fixtureCalendarDays,
  fixtureCalendarEntries,
  fixtureCalendarRounds,
  fixtureCalendarTeams,
  fixtureRoundBoards,
  hasFixtureFilters,
  initialFixtureMonth,
  nextFixtureDate,
  NO_FIXTURE_FILTERS,
  validFixtureFilters,
  type FixtureCalendarFilters,
} from "./fixture-calendar-model.ts";
import { FixtureCalendarAgenda } from "./fixture-calendar-agenda.tsx";
import { FixtureCalendarMonth } from "./fixture-calendar-month.tsx";
import { FixtureCalendarRounds } from "./fixture-calendar-rounds.tsx";
import { fixtureCalendarFormat, type FixtureCalendarScope } from "./fixture-calendar-parts.tsx";
import { useFixtureMonthViewFits } from "./fixture-calendar-viewport.ts";
import { styles } from "./fixture-calendar.styles.ts";
import {
  fixtureCalendarSearchSchema,
  type FixtureCalendarSearch,
} from "./fixture-calendar-search.ts";

export type FixtureCalendarViewKind = "agenda" | "month" | "rounds";

const ALL = "all";

/**
 * The schedule in three readings: Agenda (default), a month Calendar and Rounds.
 * The month needs width, so narrow screens offer only Agenda and Rounds; a reader who
 * picked the month and then narrows the window sees the Agenda instead.
 */
export function FixtureCalendar({
  initialView = "agenda",
  now,
  refreshFailed,
  retry,
  view,
  ...scope
}: FixtureCalendarScope & {
  readonly view: CompetitionFixtureView;
  /** When the page was opened; marks today and the next date in the competition's zone. */
  readonly now: Date;
  readonly refreshFailed: boolean;
  readonly retry: () => void;
  readonly initialView?: FixtureCalendarViewKind;
}) {
  const { locale, t } = useI18n();
  const monthFits = useFixtureMonthViewFits();
  const teamTrigger = useRef<HTMLButtonElement>(null);
  const locationSearch = useRouterState({ select: (state) => state.location.search });
  const selection = fixtureCalendarSearchSchema.parse(locationSearch);
  const navigate = useNavigate({ from: "/orgs/$orgId/competitions/$competitionId/fixture" });
  const changeSelection = (patch: Partial<FixtureCalendarSearch>) => {
    void navigate({
      replace: true,
      resetScroll: false,
      search: (previous) => ({ ...previous, ...patch }),
    });
  };
  const chosenView = selection.view ?? initialView;
  const chosenFilters = { teamId: selection.team ?? null, roundId: selection.round ?? null };
  const chosenMonth = selection.month;
  const chosenDay = selection.day;

  const activeView = chosenView === "month" && !monthFits ? "agenda" : chosenView;
  const today = zonedDateKey(now.toISOString(), view.timeZone);
  const format = fixtureCalendarFormat(locale, view.timeZone, t, view.stages.length);
  const entries = fixtureCalendarEntries(view);
  const teams = fixtureCalendarTeams(view, locale);
  const rounds = fixtureCalendarRounds(view);
  const filters = validFixtureFilters(chosenFilters, teams, rounds);
  const filtered = filterFixtureEntries(entries, filters);
  const days = fixtureCalendarDays(filtered);
  const nextDate = nextFixtureDate(filtered, today);
  const month = chosenMonth ?? initialFixtureMonth(filtered, today);
  const selectedDay =
    chosenDay && monthOf(chosenDay) === month ? chosenDay : defaultFixtureDay(days, month, today);

  // The month and day follow the filters: a new filter reopens on its next date.
  const changeFilters = (next: FixtureCalendarFilters) => {
    changeSelection({
      team: next.teamId ?? undefined,
      round: next.roundId ?? undefined,
      month: undefined,
      day: undefined,
    });
  };

  const resetFilters = () => {
    changeFilters(NO_FIXTURE_FILTERS);
    teamTrigger.current?.focus();
  };

  const teamItems = [
    { value: ALL, label: t("fixture.filters.allTeams") },
    ...teams.map((team) => ({
      value: team.teamId,
      label:
        team.name ??
        fixtureSideLabel({ kind: "team", teamId: team.teamId, name: null, withdrawn: false }, t),
    })),
  ];
  const roundItems = [
    { value: ALL, label: t("fixture.filters.allRounds") },
    ...rounds.map((round) => {
      const label = fixtureRoundLabel(round.name, t);
      return {
        value: round.id,
        label: format.showStage
          ? t("fixture.filters.roundOption", {
              stage: fixtureStageLabel(round.stageKind, t),
              round: label,
            })
          : label,
      };
    }),
  ];

  const views: { value: FixtureCalendarViewKind; label: string; icon: typeof ListBulletsIcon }[] = [
    { value: "agenda", label: t("fixture.views.agenda"), icon: ListBulletsIcon },
    ...(monthFits
      ? [{ value: "month" as const, label: t("fixture.views.month"), icon: CalendarBlankIcon }]
      : []),
    { value: "rounds", label: t("fixture.views.rounds"), icon: ColumnsIcon },
  ];

  const filteredEmpty = (
    <EmptyState>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("fixture.filtered.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("fixture.filtered.description")}</EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button onClick={resetFilters} variant="outline">
          {t("fixture.filters.reset")}
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );

  const panel = (() => {
    if (filtered.length === 0) return filteredEmpty;
    switch (activeView) {
      case "agenda":
        return (
          <FixtureCalendarAgenda
            days={days}
            format={format}
            nextDate={nextDate}
            timeZone={view.timeZone}
            {...scope}
          />
        );
      case "month":
        return (
          <FixtureCalendarMonth
            days={days}
            format={format}
            month={month}
            nextDate={nextDate}
            onMonthChange={(next) => {
              changeSelection({ month: next, day: undefined });
            }}
            onSelectDay={(day) => {
              changeSelection({ month: monthOf(day), day });
            }}
            selectedDay={selectedDay}
            timeZone={view.timeZone}
            today={today}
            {...scope}
          />
        );
      case "rounds":
        return (
          <FixtureCalendarRounds
            boards={fixtureRoundBoards(view, entries, filters)}
            currentRoundId={currentFixtureRoundId(entries, today)}
            format={format}
            {...scope}
          />
        );
      default: {
        const exhaustive: never = activeView;
        return exhaustive;
      }
    }
  })();

  return (
    <div {...applyStyles(styles.root)}>
      {refreshFailed ? (
        <RetryAlert message={t("fixture.refreshError")} retry={retry} t={t} />
      ) : null}
      <Tabs
        className={styles.tabs}
        onValueChange={(value) => {
          if (value === "agenda" || value === "month" || value === "rounds")
            changeSelection({ view: value });
        }}
        value={activeView}
        variant="pills"
      >
        <div {...applyStyles(styles.toolbar)}>
          <TabsList aria-label={t("fixture.views.label")}>
            {views.map(({ icon: Icon, label, value }) => (
              <TabsTrigger key={value} value={value}>
                <Icon aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Caption as="p" className={styles.zone}>
            <ClockIcon aria-hidden="true" {...applyStyles(styles.zoneIcon)} />
            {t("fixture.timeZone", { zone: view.timeZone })}
          </Caption>
        </div>
        <div aria-label={t("fixture.filters.label")} role="group" {...applyStyles(styles.filters)}>
          <div {...applyStyles(styles.filterField)}>
            <Field>
              <FieldLabel htmlFor="fixture-team-filter">{t("fixture.filters.team")}</FieldLabel>
              <Select
                items={teamItems}
                onValueChange={(value) =>
                  changeFilters({
                    ...filters,
                    teamId: !value || value === ALL ? null : String(value),
                  })
                }
                value={filters.teamId ?? ALL}
              >
                <SelectTrigger
                  className={styles.filterTrigger}
                  id="fixture-team-filter"
                  ref={teamTrigger}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div {...applyStyles(styles.filterField)}>
            <Field>
              <FieldLabel htmlFor="fixture-round-filter">{t("fixture.filters.round")}</FieldLabel>
              <Select
                items={roundItems}
                onValueChange={(value) =>
                  changeFilters({
                    ...filters,
                    roundId: !value || value === ALL ? null : String(value),
                  })
                }
                value={filters.roundId ?? ALL}
              >
                <SelectTrigger className={styles.filterTrigger} id="fixture-round-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roundItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {hasFixtureFilters(filters) ? (
            <Button onClick={resetFilters} variant="ghost">
              {t("fixture.filters.reset")}
            </Button>
          ) : null}
          <Caption as="p" className={styles.status} role="status">
            {t("fixture.summary", { count: filtered.length, dates: days.length })}
          </Caption>
        </div>
        {views.map(({ value }) => (
          <TabsContent className={styles.panel} key={value} value={value}>
            {value === activeView ? panel : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
