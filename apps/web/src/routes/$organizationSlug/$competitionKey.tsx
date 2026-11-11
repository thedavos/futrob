import { Outlet, createFileRoute, notFound, useLocation, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import {
  parsePortalRef,
  PORTAL_SECTIONS,
  portalPath,
  type PortalSection,
} from "@/modules/public-portal/presentation/public-portal-model.ts";
import { PublicPortalLayout } from "@/modules/public-portal/presentation/public-portal-layout.tsx";
import {
  PortalError,
  PortalNotFound,
} from "@/modules/public-portal/presentation/public-portal-states.tsx";
import { getPublicPortalCompetition } from "@/modules/public-portal/server/public-portal.functions.ts";
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
    const read = await getPublicPortalCompetition({ data: ref });
    if (read.status === "not_found") throw notFound();
    if (read.status === "error") throw new Error("public_portal.unavailable");
    return { ref, competition: read.data.competition };
  },
  head: ({ loaderData, matches }) => {
    const t = createTranslator(rootLocaleSchema.parse(matches[0]?.loaderData));
    if (!loaderData) return { meta: [{ title: `${t("portal.notFound.title")} | Futrob` }] };
    const { name } = loaderData.competition;
    return {
      meta: [
        { title: `${name} | Futrob` },
        { name: "description", content: t("portal.meta.description", { name }) },
      ],
    };
  },
  component: PortalLayoutRoute,
  notFoundComponent: PortalNotFound,
  errorComponent: PortalLayoutError,
});

function PortalLayoutRoute() {
  const { competition, ref } = Route.useLoaderData();
  const { pathname } = useLocation();
  const section =
    PORTAL_SECTIONS.find((candidate: PortalSection) => portalPath(ref, candidate) === pathname) ??
    null;
  return (
    <PublicPortalLayout competition={competition} portalRef={ref} section={section}>
      <Outlet />
    </PublicPortalLayout>
  );
}

function PortalLayoutError() {
  const router = useRouter();
  return <PortalError onRetry={() => void router.invalidate()} />;
}
