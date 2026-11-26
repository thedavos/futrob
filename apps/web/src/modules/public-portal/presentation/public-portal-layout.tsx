import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { PublicCompetitionDto, PublicCompetitionStatusDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Caption,
  Eyebrow,
  Logo,
  PageHeaderTitle,
  Skeleton,
  TextLink,
  vis,
} from "@futrob/ui";
import {
  competitionFormatLabel,
  competitionPlatformLabel,
  competitionRegionLabel,
  competitionScheduleLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import { COMPETITION_COVER_ASSETS } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import {
  PORTAL_SECTIONS,
  portalSections,
  type PortalRef,
  type PortalSection,
} from "./public-portal-model.ts";
import { styles } from "./public-portal.styles.ts";

const SECTION_ROUTES = {
  cover: "/$organizationSlug/$competitionKey",
  calendar: "/$organizationSlug/$competitionKey/calendar",
  standings: "/$organizationSlug/$competitionKey/standings",
  bracket: "/$organizationSlug/$competitionKey/bracket",
  teams: "/$organizationSlug/$competitionKey/teams",
  rankings: "/$organizationSlug/$competitionKey/rankings",
  rules: "/$organizationSlug/$competitionKey/rules",
} as const satisfies Record<PortalSection, string>;

const SECTION_LABELS = {
  cover: "portal.section.cover",
  calendar: "portal.section.calendar",
  standings: "portal.section.standings",
  bracket: "portal.section.bracket",
  teams: "portal.section.teams",
  rankings: "portal.section.rankings",
  rules: "portal.section.rules",
} as const satisfies Record<PortalSection, ParameterlessMessageKey>;

const STATUS_LABELS = {
  published: "portal.status.published",
  paused: "portal.status.paused",
  finished: "portal.status.finished",
} as const satisfies Record<PublicCompetitionStatusDto, ParameterlessMessageKey>;

const STATUS_BADGES = {
  published: "primary",
  paused: "warning",
  finished: "neutral",
} as const satisfies Record<PublicCompetitionStatusDto, "primary" | "warning" | "neutral">;

/** Route path of a portal section, for links that stay inside the portal. */
export function portalSectionRoute<S extends PortalSection>(
  section: S,
): (typeof SECTION_ROUTES)[S] {
  return SECTION_ROUTES[section];
}

/**
 * The spectator's frame: competition header and sticky section tabs, no admin sidebar and no
 * operator actions (UX-PUB-001). Everything inside comes from the anonymous public reads.
 */
export function PublicPortalLayout({
  busyLabel,
  children,
  competition,
  portalRef,
  section,
}: {
  readonly busyLabel?: string;
  readonly children: ReactNode;
  readonly competition?: PublicCompetitionDto;
  readonly portalRef?: PortalRef;
  readonly section: PortalSection | null;
}) {
  const { locale, t } = useI18n();
  const pending = competition === undefined;
  const cover = pending ? null : COMPETITION_COVER_ASSETS[competition.coverPreset ?? "cup"].src;
  const schedule = pending
    ? null
    : competitionScheduleLabel(
        { startsOn: competition.startsOn, endsOn: competition.endsOn },
        locale,
        t,
      );
  const facts = pending
    ? []
    : [
        competitionFormatLabel(competition.format, t),
        `${competition.gameEdition} · ${competitionPlatformLabel(competition.platform)}`,
        competitionRegionLabel(competition.region, t),
        t("portal.header.teams", { count: competition.approvedTeamCount }),
        schedule,
      ].filter((part): part is string => part !== null);
  const tabs = competition ? portalSections(competition.format) : PORTAL_SECTIONS;

  return (
    <div
      aria-busy={busyLabel ? true : undefined}
      aria-label={busyLabel}
      {...applyStyles(styles.page)}
    >
      {busyLabel ? (
        <span aria-label={busyLabel} role="status" {...applyStyles(vis.srOnly)}>
          {busyLabel}
        </span>
      ) : null}
      <header>
        <div {...applyStyles(styles.container, styles.topBar)}>
          <Link aria-label="Futrob" to="/" {...applyStyles(styles.brand)}>
            <Logo {...applyStyles(styles.brandLogo)} />
          </Link>
          {pending ? (
            <Skeleton {...applyStyles(styles.timeZoneBone)} />
          ) : (
            <Caption>{t("portal.header.timeZone", { zone: competition.timeZone })}</Caption>
          )}
        </div>
        <div {...applyStyles(styles.container, styles.hero)}>
          {cover ? (
            <img
              alt=""
              data-outline="none"
              height={120}
              src={cover}
              width={120}
              {...applyStyles(styles.cover)}
            />
          ) : (
            <Skeleton {...applyStyles(styles.cover)} />
          )}
          <div {...applyStyles(styles.heroCopy)}>
            <Eyebrow>{t("portal.header.eyebrow")}</Eyebrow>
            {pending ? (
              <Skeleton {...applyStyles(styles.titleBone)} />
            ) : (
              <PageHeaderTitle {...applyStyles(styles.title)}>{competition.name}</PageHeaderTitle>
            )}
            <div {...applyStyles(styles.facts)}>
              {pending ? (
                <>
                  <Skeleton {...applyStyles(styles.badgeBone)} />
                  <Skeleton {...applyStyles(styles.factsBone)} />
                </>
              ) : (
                <>
                  <Badge variant={STATUS_BADGES[competition.status]}>
                    {t(STATUS_LABELS[competition.status])}
                  </Badge>
                  <Caption as="p">{facts.join(" · ")}</Caption>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <nav aria-label={t("portal.nav.label")} {...applyStyles(styles.tabsBar)}>
        <ul {...applyStyles(styles.container, styles.tabs)}>
          {tabs.map((item) => (
            <li key={item}>
              {portalRef ? (
                <Link
                  aria-current={item === section ? "page" : undefined}
                  params={portalRef}
                  to={SECTION_ROUTES[item]}
                  {...applyStyles(styles.tab, item === section && styles.tabActive)}
                >
                  {t(SECTION_LABELS[item])}
                </Link>
              ) : (
                <span {...applyStyles(styles.tab, item === section && styles.tabActive)}>
                  {t(SECTION_LABELS[item])}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <main {...applyStyles(styles.container, styles.main)}>{children}</main>
      <footer {...applyStyles(styles.footer)}>
        <div {...applyStyles(styles.container, styles.footerInner)}>
          <Caption>{t("portal.footer.poweredBy")}</Caption>
          <TextLink render={<Link to="/" />} text="caption">
            {t("portal.footer.home")}
          </TextLink>
        </div>
      </footer>
    </div>
  );
}
