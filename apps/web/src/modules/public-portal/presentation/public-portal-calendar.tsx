import { useId, useState, type ReactNode } from "react";
import { ClockIcon, ColumnsIcon, ListBulletsIcon } from "@phosphor-icons/react";
import type { PublicEncounterStatusDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Heading,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  vis,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  calendarDayLabel,
  calendarDays,
  calendarRounds,
  calendarTeamNames,
  filterCalendarEntries,
  type PortalCalendarFilters,
} from "./public-portal-model.ts";
import { PortalEncounterList } from "./public-portal-shared.tsx";
import { PortalEmpty } from "./public-portal-states.tsx";
import { calendarStyles } from "./public-portal-calendar.styles.ts";
import type { PortalCalendar } from "./public-portal-cover.tsx";

export { PortalCoverView, type PortalCalendar } from "./public-portal-cover.tsx";

const ALL = "all";
type CalendarViewMode = "rounds" | "agenda";

const STATUS_OPTIONS: readonly PublicEncounterStatusDto[] = [
  "official",
  "awaiting_result",
  "scheduled",
];

export function PortalNoFixture() {
  const { t } = useI18n();
  return (
    <PortalEmpty
      description={t("portal.noFixture.description")}
      title={t("portal.noFixture.title")}
    />
  );
}

function GroupSection({
  children,
  headingClassName,
  meta,
  title,
}: {
  readonly children: ReactNode;
  readonly headingClassName?: typeof calendarStyles.dayHeading;
  readonly meta: string;
  readonly title: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} {...applyStyles(calendarStyles.group)}>
      <div {...applyStyles(calendarStyles.groupHeader)}>
        <Heading as="h2" className={headingClassName} id={headingId}>
          {title}
        </Heading>
        <Caption as="p">{meta}</Caption>
      </div>
      {children}
    </section>
  );
}

/**
 * Public calendar and results (Alternative A): round and agenda views with team, round, and
 * status filters, sporting matchup rows, and clear official vs. pending badges.
 */
export function PortalCalendarView({
  calendar,
  initialTeam = null,
}: {
  readonly calendar: PortalCalendar;
  readonly initialTeam?: string | null;
}) {
  const { locale, t } = useI18n();
  const teamSelectId = useId();
  const roundSelectId = useId();
  const statusSelectId = useId();

  const teams = calendarTeamNames(calendar.entries, locale);
  const allRounds = calendarRounds(calendar.entries);
  const validInitialTeam = initialTeam && teams.includes(initialTeam) ? initialTeam : null;

  const [view, setView] = useState<CalendarViewMode>("rounds");
  const [filters, setFilters] = useState<PortalCalendarFilters>({
    team: validInitialTeam,
    round: null,
    status: null,
  });

  if (calendar.entries.length === 0) return <PortalNoFixture />;

  const activeFilters: PortalCalendarFilters = {
    team: filters.team && teams.includes(filters.team) ? filters.team : null,
    round:
      filters.round !== null && allRounds.some((round) => round.roundNumber === filters.round)
        ? filters.round
        : null,
    status: filters.status,
  };
  const hasActiveFilters =
    activeFilters.team !== null || activeFilters.round !== null || activeFilters.status !== null;
  const filtered = filterCalendarEntries(calendar.entries, activeFilters);
  const rounds = calendarRounds(filtered);
  const days = calendarDays(filtered, calendar.timeZone);

  const teamItems = [
    { value: ALL, label: t("portal.calendar.filter.allTeams") },
    ...teams.map((name) => ({ value: name, label: name })),
  ];
  const roundItems = [
    { value: ALL, label: t("portal.calendar.filter.allRounds") },
    ...allRounds.map((round) => ({
      value: String(round.roundNumber),
      label: t("portal.calendar.round", { round: round.roundNumber }),
    })),
  ];
  const statusItems = [
    { value: ALL, label: t("portal.calendar.filter.allStatuses") },
    ...STATUS_OPTIONS.map((status) => ({
      value: status,
      label: t(`portal.encounter.status.${status}`),
    })),
  ];

  const resetFilters = () => setFilters({ team: null, round: null, status: null });

  const filteredEmpty = (
    <EmptyState>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("portal.calendar.filteredEmpty.title")}</EmptyStateTitle>
        <EmptyStateDescription>
          {t("portal.calendar.filteredEmpty.description")}
        </EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button onClick={resetFilters} type="button" variant="outline">
          {t("portal.calendar.filter.clear")}
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );

  return (
    <div {...applyStyles(calendarStyles.root)}>
      <Tabs
        className={calendarStyles.tabs}
        onValueChange={(value) => {
          if (value === "rounds" || value === "agenda") setView(value);
        }}
        value={view}
        variant="pills"
      >
        <div {...applyStyles(calendarStyles.toolbar)}>
          <TabsList aria-label={t("portal.calendar.views.label")}>
            <TabsTrigger value="rounds">
              <ColumnsIcon aria-hidden="true" />
              {t("portal.calendar.views.rounds")}
            </TabsTrigger>
            <TabsTrigger value="agenda">
              <ListBulletsIcon aria-hidden="true" />
              {t("portal.calendar.views.agenda")}
            </TabsTrigger>
          </TabsList>

          <div
            aria-label={t("fixture.filters.label")}
            role="group"
            {...applyStyles(calendarStyles.controls)}
          >
            {teams.length > 1 ? (
              <div {...applyStyles(calendarStyles.filterSlot)}>
                <label htmlFor={teamSelectId} {...applyStyles(vis.srOnly)}>
                  {t("portal.calendar.filter.team")}
                </label>
                <Select
                  items={teamItems}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      team: !value || value === ALL ? null : String(value),
                    }))
                  }
                  value={activeFilters.team ?? ALL}
                >
                  <SelectTrigger
                    aria-label={t("portal.calendar.filter.team")}
                    className={calendarStyles.filterTrigger}
                    dense
                    id={teamSelectId}
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
              </div>
            ) : null}

            {allRounds.length > 1 ? (
              <div {...applyStyles(calendarStyles.filterSlot)}>
                <label htmlFor={roundSelectId} {...applyStyles(vis.srOnly)}>
                  {t("portal.calendar.filter.round")}
                </label>
                <Select
                  items={roundItems}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      round: !value || value === ALL ? null : Number(value),
                    }))
                  }
                  value={activeFilters.round !== null ? String(activeFilters.round) : ALL}
                >
                  <SelectTrigger
                    aria-label={t("portal.calendar.filter.round")}
                    className={calendarStyles.filterTrigger}
                    dense
                    id={roundSelectId}
                  >
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
              </div>
            ) : null}

            <div {...applyStyles(calendarStyles.filterSlot)}>
              <label htmlFor={statusSelectId} {...applyStyles(vis.srOnly)}>
                {t("portal.calendar.filter.status")}
              </label>
              <Select
                items={statusItems}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    status:
                      value === "official" || value === "awaiting_result" || value === "scheduled"
                        ? value
                        : null,
                  }))
                }
                value={activeFilters.status ?? ALL}
              >
                <SelectTrigger
                  aria-label={t("portal.calendar.filter.status")}
                  className={calendarStyles.filterTrigger}
                  dense
                  id={statusSelectId}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters ? (
              <Button dense onClick={resetFilters} type="button" variant="ghost">
                {t("portal.calendar.filter.clear")}
              </Button>
            ) : null}
          </div>
        </div>

        <div {...applyStyles(calendarStyles.metaBar)}>
          <Caption as="p" role="status">
            {t("portal.calendar.summary", {
              shown: filtered.length,
              total: calendar.entries.length,
            })}
          </Caption>
          <Caption as="p" className={calendarStyles.zone}>
            <ClockIcon aria-hidden="true" {...applyStyles(calendarStyles.zoneIcon)} />
            {t("portal.header.timeZone", { zone: calendar.timeZone })}
          </Caption>
        </div>

        <TabsContent className={calendarStyles.panel} value="rounds">
          {filtered.length === 0
            ? filteredEmpty
            : rounds.map((round) => {
                const officialCount = round.entries.filter(
                  (entry) => entry.status === "official",
                ).length;
                return (
                  <GroupSection
                    key={round.roundNumber}
                    meta={t("portal.calendar.roundSummary", {
                      official: officialCount,
                      total: round.entries.length,
                    })}
                    title={t("portal.calendar.round", { round: round.roundNumber })}
                  >
                    <PortalEncounterList entries={round.entries} timeZone={calendar.timeZone} />
                  </GroupSection>
                );
              })}
        </TabsContent>

        <TabsContent className={calendarStyles.panel} value="agenda">
          {filtered.length === 0
            ? filteredEmpty
            : days.map((day) => {
                const officialCount = day.entries.filter(
                  (entry) => entry.status === "official",
                ).length;
                return (
                  <GroupSection
                    headingClassName={calendarStyles.dayHeading}
                    key={day.dateKey}
                    meta={t("portal.calendar.roundSummary", {
                      official: officialCount,
                      total: day.entries.length,
                    })}
                    title={calendarDayLabel(day.firstIso, calendar.timeZone, locale)}
                  >
                    <PortalEncounterList
                      entries={day.entries}
                      timeOnly
                      timeZone={calendar.timeZone}
                    />
                  </GroupSection>
                );
              })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
