import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { PublicRankingKindDto } from "@futrob/api-contracts";
import { applyStyles, vis } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PublicPortalLayout } from "./public-portal-layout.tsx";
import { PortalSectionBones } from "./public-portal-skeleton-bones.tsx";
import {
  portalRankingKindFromSearch,
  portalRankingSearchSchema,
  portalSectionFromPathname,
  type PortalRef,
  type PortalSection,
} from "./public-portal-model.ts";

function Busy({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <div aria-busy="true" aria-label={label} role="group">
        {children}
      </div>
    </>
  );
}

export function PortalSectionLoading({
  portalRef = null,
  rankingKind = "scorer",
  section,
}: {
  readonly portalRef?: PortalRef | null;
  readonly rankingKind?: PublicRankingKindDto;
  readonly section: PortalSection;
}) {
  const { t } = useI18n();
  return (
    <Busy label={t("portal.loading")}>
      <PortalSectionBones portalRef={portalRef} rankingKind={rankingKind} section={section} />
    </Busy>
  );
}

export function PortalCoverLoading({ portalRef }: { readonly portalRef: PortalRef }) {
  return <PortalSectionLoading portalRef={portalRef} section="cover" />;
}

export function PortalCalendarLoading() {
  return <PortalSectionLoading section="calendar" />;
}

export function PortalStandingsLoading() {
  return <PortalSectionLoading section="standings" />;
}

export function PortalBracketLoading() {
  return <PortalSectionLoading section="bracket" />;
}

export function PortalTeamsLoading() {
  return <PortalSectionLoading section="teams" />;
}

export function PortalRankingsLoading({
  rankingKind = "scorer",
}: {
  readonly rankingKind?: PublicRankingKindDto;
}) {
  return <PortalSectionLoading rankingKind={rankingKind} section="rankings" />;
}

export function PortalRulesLoading() {
  return <PortalSectionLoading section="rules" />;
}

/** Full portal chrome while the competition identity is still loading. */
export function PortalFrameLoading() {
  const { t } = useI18n();
  const { pathname, search, searchStr } = useLocation();
  const section = portalSectionFromPathname(pathname);
  const parsedSearch = portalRankingSearchSchema.safeParse(search);
  const rankingKind =
    section === "rankings"
      ? parsedSearch.success && parsedSearch.data.kind !== undefined
        ? parsedSearch.data.kind
        : portalRankingKindFromSearch(searchStr)
      : undefined;
  return (
    <PublicPortalLayout busyLabel={t("portal.loading.page")} section={section}>
      <PortalSectionBones rankingKind={rankingKind} section={section} />
    </PublicPortalLayout>
  );
}
