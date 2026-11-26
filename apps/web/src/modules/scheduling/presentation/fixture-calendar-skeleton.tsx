import { CalendarBlankIcon, ColumnsIcon, ListBulletsIcon } from "@phosphor-icons/react";
import { applyStyles, Skeleton, typography, vis } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { bones } from "./fixture-calendar-skeleton.styles.ts";
import { styles } from "./fixture-calendar.styles.ts";

const DAYS: readonly { readonly rows: number }[] = [{ rows: 3 }, { rows: 3 }, { rows: 2 }];
const INDEX_PRIMARY = [0, 1, 2, 3, 4];
const INDEX_SECONDARY = [0, 1];

/**
 * Loading layout for the competition calendar. Mirrors the Agenda toolbar, filters
 * and schedule so the page does not jump when the fixture read resolves.
 */
export function FixtureCalendarSkeleton() {
  const { t } = useI18n();
  const label = t("fixture.loading");

  return (
    <div aria-busy="true" aria-label={label} {...applyStyles(styles.root)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <div aria-hidden="true" inert {...applyStyles(styles.toolbar, bones.inert)}>
        <div {...applyStyles(bones.tabsList)}>
          <span {...applyStyles(typography.label, bones.tab, bones.tabActive)}>
            <ListBulletsIcon aria-hidden="true" {...applyStyles(bones.tabIcon)} />
            {t("fixture.views.agenda")}
          </span>
          <span {...applyStyles(typography.label, bones.tab, bones.tabMonth)}>
            <CalendarBlankIcon aria-hidden="true" {...applyStyles(bones.tabIcon)} />
            {t("fixture.views.month")}
          </span>
          <span {...applyStyles(typography.label, bones.tab)}>
            <ColumnsIcon aria-hidden="true" {...applyStyles(bones.tabIcon)} />
            {t("fixture.views.rounds")}
          </span>
        </div>
        <div {...applyStyles(styles.controls, bones.controls)}>
          <div {...applyStyles(styles.filterSlot)}>
            <Skeleton {...applyStyles(bones.filter)} />
          </div>
          <div {...applyStyles(styles.filterSlot)}>
            <Skeleton {...applyStyles(bones.filter)} />
          </div>
        </div>
      </div>
      <div aria-hidden="true" inert {...applyStyles(styles.metaBar, bones.inert)}>
        <Skeleton {...applyStyles(bones.summary)} />
        <Skeleton {...applyStyles(bones.zone)} />
      </div>
      <div aria-hidden="true" inert {...applyStyles(styles.panel, bones.inert)}>
        <div {...applyStyles(styles.agendaLayout)}>
          <ol {...applyStyles(styles.dayList)}>
            {DAYS.map((day, dayIndex) => (
              <li key={dayIndex}>
                <section {...applyStyles(styles.daySection)}>
                  <div {...applyStyles(styles.dayHeading)}>
                    <div {...applyStyles(styles.dayHeadingMain)}>
                      <span {...applyStyles(styles.dateStamp)}>
                        <Skeleton {...applyStyles(bones.stampFill)} />
                      </span>
                      <div {...applyStyles(styles.dayCopy)}>
                        <Skeleton {...applyStyles(bones.dayTitle)} />
                        <Skeleton {...applyStyles(bones.dayMeta)} />
                      </div>
                    </div>
                  </div>
                  <ol {...applyStyles(styles.rows)}>
                    {Array.from({ length: day.rows }, (_, rowIndex) => (
                      <li key={rowIndex} {...applyStyles(styles.rowItem)}>
                        <div {...applyStyles(styles.row)}>
                          <Skeleton {...applyStyles(bones.time)} />
                          <span {...applyStyles(styles.rowMain)}>
                            <span {...applyStyles(styles.matchup)}>
                              <Skeleton {...applyStyles(bones.sideHome)} />
                              <Skeleton {...applyStyles(styles.versusPill, bones.versus)} />
                              <Skeleton {...applyStyles(bones.sideAway)} />
                            </span>
                          </span>
                          <Skeleton {...applyStyles(styles.chevron, bones.chevron)} />
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </li>
            ))}
          </ol>
          <aside {...applyStyles(styles.aside)}>
            <Skeleton {...applyStyles(bones.indexTitle)} />
            <div data-slot="fixture-index-skeleton" {...applyStyles(styles.indexNav)}>
              <IndexGroup count={INDEX_PRIMARY} />
              <IndexGroup count={INDEX_SECONDARY} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function IndexGroup({ count }: { readonly count: readonly number[] }) {
  return (
    <div {...applyStyles(styles.indexGroup)}>
      <Skeleton {...applyStyles(bones.indexStage)} />
      <ol {...applyStyles(styles.indexList)}>
        {count.map((index) => (
          <li key={index}>
            <div {...applyStyles(styles.indexLink)}>
              <Skeleton {...applyStyles(bones.indexLabel)} />
              <Skeleton {...applyStyles(bones.indexDate)} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
