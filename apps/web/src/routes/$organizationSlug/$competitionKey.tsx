import { Outlet, createFileRoute, notFound, useLocation, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import {
  layoutPublicBracketStage,
  publicBracketChampionName,
} from "@/modules/public-portal/presentation/public-portal-bracket-model.ts";
import {
  hasBracket,
  parsePortalRef,
  portalCalendarProgress,
  portalPath,
} from "@/modules/public-portal/presentation/public-portal-model.ts";
import {
  portalHead,
  portalSectionAt,
} from "@/modules/public-portal/presentation/public-portal-meta.ts";
import { PublicPortalLayout } from "@/modules/public-portal/presentation/public-portal-layout.tsx";
import { PortalFrameLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import {
  PortalError,
  PortalNotFound,
} from "@/modules/public-portal/presentation/public-portal-states.tsx";
import {
  getPublicPortalBracket,
  getPublicPortalCalendar,
  getPublicPortalCompetition,
  getPublicPortalStandings,
} from "@/modules/public-portal/server/public-portal.functions.ts";
import { getSiteOrigin } from "@/shared/infrastructure/seo/site-origin.ts";
import { NOINDEX_META } from "@/shared/infrastructure/seo/crawl-policy.ts";
import { SUPPORTED_LOCALES } from "@/shared/presentation/i18n/catalogs.ts";
import { DEFAULT_LOCALE } from "@/shared/presentation/i18n/locale.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";

const rootLocaleSchema = z.enum(SUPPORTED_LOCALES).catch(DEFAULT_LOCALE);

/**
 * Public portal of a published competition (ADR-0024): `/{organizationSlug}/{competitionKey}`.
 * Signed-out visitors get it server-rendered; a missing, unpublished or another organization's
 * competition is the same not-found page.
 */
export const Route = createFileRoute("/$organizationSlug/$competitionKey")({
  loader: async ({ params }) => {
    const ref = parsePortalRef(params);
    if (!ref) throw notFound();
    const [competitionRead, calendarRead] = await Promise.all([
      getPublicPortalCompetition({ data: ref }),
      getPublicPortalCalendar({ data: ref }),
    ]);
    if (competitionRead.status === "not_found") throw notFound();
    if (competitionRead.status === "error") throw new Error("public_portal.unavailable");

    const { competition } = competitionRead.data;
    const progress =
      calendarRead.status === "ready"
        ? portalCalendarProgress(calendarRead.data.calendar.entries)
        : null;

    let championName: string | null = null;
    if (competition.status === "finished") {
      if (hasBracket(competition.format)) {
        const bracketRead = await getPublicPortalBracket({ data: ref });
        if (bracketRead.status === "ready" && bracketRead.data.bracket) {
          const lastStage = bracketRead.data.bracket.stages.at(-1);
          if (lastStage) {
            championName = publicBracketChampionName(layoutPublicBracketStage(lastStage));
          }
        }
      } else {
        const standingsRead = await getPublicPortalStandings({ data: ref });
        if (standingsRead.status === "ready") {
          championName = standingsRead.data.standings.rows[0]?.teamName ?? null;
        }
      }
    }

    return { ref, competition, progress, championName, origin: getSiteOrigin() };
  },
  head: ({ loaderData, matches }) => {
    const t = createTranslator(rootLocaleSchema.parse(matches[0]?.loaderData));
    if (!loaderData) {
      return { meta: [{ title: `${t("portal.notFound.title")} | Futrob` }, NOINDEX_META] };
    }
    const { competition, origin, ref } = loaderData;
    const pathname = matches[matches.length - 1]?.pathname ?? portalPath(ref);
    return portalHead({ origin, ref, competition, section: portalSectionAt(ref, pathname), t });
  },
  component: PortalLayoutRoute,
  pendingComponent: PortalFrameLoading,
  notFoundComponent: PortalNotFound,
  errorComponent: PortalLayoutError,
});

function PortalLayoutRoute() {
  const { championName, competition, progress, ref } = Route.useLoaderData();
  const { pathname } = useLocation();
  const section = portalSectionAt(ref, pathname);
  return (
    <PublicPortalLayout
      championName={championName}
      competition={competition}
      portalRef={ref}
      progress={progress}
      section={section}
    >
      <Outlet />
    </PublicPortalLayout>
  );
}

function PortalLayoutError() {
  const router = useRouter();
  return <PortalError onRetry={() => void router.invalidate()} />;
}
