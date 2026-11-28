import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon, CheckIcon, ShareNetworkIcon, TrophyIcon } from "@phosphor-icons/react";
import type { PublicCompetitionDto, PublicCompetitionStatusDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Eyebrow,
  Logo,
  PageHeaderTitle,
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  Skeleton,
  TextLink,
  typography,
  useCopyToClipboard,
  vis,
} from "@futrob/ui";
import backgroundMatchUrl from "@/assets/background-match.png";
import { COMPETITION_COVER_ASSETS } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import {
  competitionFormatLabel,
  competitionGameEditionLabel,
  competitionPlatformLabel,
  competitionRegionLabel,
  competitionScheduleLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  organizationSlugLabel,
  PORTAL_SECTIONS,
  portalPath,
  portalSections,
  type PortalProgress,
  type PortalRef,
  type PortalSection,
} from "./public-portal-model.ts";
import { layoutStyles } from "./public-portal-layout.styles.ts";

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

function SharePortalButton({ portalRef }: { readonly portalRef: PortalRef }) {
  const { t } = useI18n();
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const handleShare = () => {
    const location = globalThis.location;
    const url = location?.href || `${location?.origin ?? ""}${portalPath(portalRef)}`;
    void copyToClipboard(url);
  };

  return (
    <Button dense onClick={handleShare} type="button" variant="outline">
      {isCopied ? (
        <CheckIcon aria-hidden="true" size={16} />
      ) : (
        <ShareNetworkIcon aria-hidden="true" size={16} />
      )}
      {t(isCopied ? "portal.header.copied" : "portal.header.share")}
    </Button>
  );
}

/**
 * The spectator's frame: editorial competition hero (Alternative B) and sticky section tabs
 * (Alternative A), with no admin sidebar and no operator actions (UX-PUB-001).
 */
export function PublicPortalLayout({
  busyLabel,
  championName = null,
  children,
  competition,
  portalRef,
  progress = null,
  section,
}: {
  readonly busyLabel?: string;
  readonly championName?: string | null;
  readonly children: ReactNode;
  readonly competition?: PublicCompetitionDto;
  readonly portalRef?: PortalRef;
  readonly progress?: PortalProgress | null;
  readonly section: PortalSection | null;
}) {
  const { locale, t } = useI18n();
  const pending = competition === undefined;
  const cover = pending ? null : COMPETITION_COVER_ASSETS[competition.coverPreset ?? "cup"].src;
  const orgLabel = portalRef ? organizationSlugLabel(portalRef.organizationSlug) : null;
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
        competitionRegionLabel(competition.region, t),
        t("portal.header.teams", { count: competition.approvedTeamCount }),
        schedule,
      ].filter((part): part is string => part !== null);
  const eyebrowText = pending
    ? t("portal.header.eyebrow")
    : [
        orgLabel ?? t("portal.header.eyebrow"),
        `${competitionGameEditionLabel(competition.gameEdition)} · ${competitionPlatformLabel(competition.platform)}`,
      ].join(" · ");
  const tabs = competition ? portalSections(competition.format) : PORTAL_SECTIONS;

  return (
    <>
      {busyLabel ? (
        <span aria-label={busyLabel} role="status" {...applyStyles(vis.srOnly)}>
          {busyLabel}
        </span>
      ) : null}
      <div
        aria-busy={busyLabel ? true : undefined}
        aria-label={busyLabel}
        role={busyLabel ? "group" : undefined}
        {...applyStyles(layoutStyles.page)}
      >
        <header {...applyStyles(layoutStyles.headerBand)}>
          <div {...applyStyles(layoutStyles.topBarBorder)}>
            <div {...applyStyles(layoutStyles.container, layoutStyles.topBar)}>
              <div {...applyStyles(layoutStyles.brandGroup)}>
                <Link aria-label="Futrob" to="/" {...applyStyles(layoutStyles.brand)}>
                  <Logo {...applyStyles(layoutStyles.brandLogo)} />
                </Link>
                {orgLabel ? (
                  <Caption as="span" className={layoutStyles.orgContext}>
                    {`${orgLabel} · ${t("portal.header.eyebrow")}`}
                  </Caption>
                ) : null}
              </div>
              <div {...applyStyles(layoutStyles.topBarRight)}>
                {pending ? (
                  <Skeleton {...applyStyles(layoutStyles.timeZoneBone)} />
                ) : (
                  <>
                    <Caption className={layoutStyles.timeZoneLabel}>
                      {t("portal.header.timeZone", { zone: competition.timeZone })}
                    </Caption>
                    {portalRef ? <SharePortalButton portalRef={portalRef} /> : null}
                  </>
                )}
              </div>
            </div>
          </div>

          <div {...applyStyles(layoutStyles.heroSection)}>
            <img
              alt=""
              aria-hidden="true"
              data-outline="none"
              src={backgroundMatchUrl}
              {...applyStyles(layoutStyles.heroBackdrop)}
            />
            <div aria-hidden="true" {...applyStyles(layoutStyles.heroWash)} />
            <div {...applyStyles(layoutStyles.container, layoutStyles.hero)}>
              <div {...applyStyles(layoutStyles.heroMain)}>
                <div {...applyStyles(layoutStyles.coverFrame)}>
                  {cover ? (
                    <img
                      alt=""
                      data-outline="none"
                      height={92}
                      src={cover}
                      width={92}
                      {...applyStyles(layoutStyles.coverImg)}
                    />
                  ) : (
                    <Skeleton {...applyStyles(layoutStyles.coverImg)} />
                  )}
                </div>
                <div {...applyStyles(layoutStyles.heroCopy)}>
                  <Eyebrow>{eyebrowText}</Eyebrow>
                  <div {...applyStyles(layoutStyles.titleRow)}>
                    {pending ? (
                      <>
                        <Skeleton {...applyStyles(layoutStyles.titleBone)} />
                        <Skeleton {...applyStyles(layoutStyles.badgeBone)} />
                      </>
                    ) : (
                      <>
                        <PageHeaderTitle {...applyStyles(layoutStyles.title)}>
                          {competition.name}
                        </PageHeaderTitle>
                        <Badge
                          className={layoutStyles.statusBadge}
                          variant={STATUS_BADGES[competition.status]}
                        >
                          <span aria-hidden="true" {...applyStyles(layoutStyles.statusDot)} />
                          {t(STATUS_LABELS[competition.status])}
                        </Badge>
                        {championName ? (
                          <Badge className={layoutStyles.statusBadge} variant="emphasis">
                            <TrophyIcon
                              aria-hidden="true"
                              weight="fill"
                              {...applyStyles(layoutStyles.championIcon)}
                            />
                            {t("portal.header.champion", { team: championName })}
                          </Badge>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div {...applyStyles(layoutStyles.facts)}>
                    {pending ? (
                      <Skeleton {...applyStyles(layoutStyles.factsBone)} />
                    ) : (
                      <Caption as="p">{facts.join(" · ")}</Caption>
                    )}
                  </div>
                </div>
              </div>

              {!pending && progress ? (
                <div {...applyStyles(layoutStyles.progressWrap)}>
                  <Progress max={100} value={progress.percent}>
                    <ProgressLabel>
                      {t(
                        progress.completed
                          ? "portal.header.progressCompleted"
                          : "portal.header.progress",
                        { official: progress.official, total: progress.total },
                      )}
                    </ProgressLabel>
                    <ProgressValue className={layoutStyles.progressValue}>
                      {() => `${progress.percent}%`}
                    </ProgressValue>
                    <ProgressTrack>
                      <ProgressIndicator />
                    </ProgressTrack>
                  </Progress>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <nav aria-label={t("portal.nav.label")} {...applyStyles(layoutStyles.tabsBar)}>
          <ul
            aria-label={portalRef ? undefined : t("portal.nav.label")}
            tabIndex={portalRef ? undefined : 0}
            {...applyStyles(layoutStyles.container, layoutStyles.tabs)}
          >
            {tabs.map((item) => {
              const count =
                !pending && item === "teams" && competition.approvedTeamCount > 0
                  ? competition.approvedTeamCount
                  : null;
              return (
                <li key={item}>
                  {portalRef ? (
                    <Link
                      aria-current={item === section ? "page" : undefined}
                      params={portalRef}
                      to={SECTION_ROUTES[item]}
                      {...applyStyles(
                        typography.label,
                        layoutStyles.tab,
                        item === section && layoutStyles.tabActive,
                      )}
                    >
                      <span>{t(SECTION_LABELS[item])}</span>
                      {count !== null ? (
                        <span aria-hidden="true" {...applyStyles(layoutStyles.tabCount)}>
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <span
                      {...applyStyles(
                        typography.label,
                        layoutStyles.tab,
                        item === section && layoutStyles.tabActive,
                      )}
                    >
                      {t(SECTION_LABELS[item])}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <main {...applyStyles(layoutStyles.container, layoutStyles.main)}>{children}</main>

        <footer {...applyStyles(layoutStyles.footer)}>
          <div {...applyStyles(layoutStyles.container, layoutStyles.footerInner)}>
            <Caption>{t("portal.footer.poweredBy")}</Caption>
            <TextLink className={layoutStyles.footerLink} render={<Link to="/" />} text="caption">
              {t("portal.footer.home")}
              <CaretRightIcon aria-hidden="true" size={14} />
            </TextLink>
          </div>
        </footer>
      </div>
    </>
  );
}
