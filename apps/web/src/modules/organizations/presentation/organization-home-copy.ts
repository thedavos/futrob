import type { CompetitionStatusDto } from "@futrob/api-contracts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export function formatCompetitionStart(startsOn: string | null, locale: string): string | null {
  if (!startsOn) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${startsOn}T00:00:00Z`));
}

export function organizationCompetitionStatusLabel(
  status: CompetitionStatusDto,
  t: Translator,
): string {
  switch (status) {
    case "draft":
      return t("org.home.status.draft");
    case "registration":
      return t("org.home.status.registration");
    case "published":
      return t("org.home.status.published");
    case "paused":
      return t("org.home.status.paused");
    case "finished":
      return t("org.home.status.finished");
    case "archived":
      return t("org.home.status.archived");
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function organizationCompetitionHref(
  organizationId: string,
  competitionId: string,
  status: CompetitionStatusDto,
) {
  const params = { orgId: organizationId, competitionId };
  if (status === "draft") {
    return {
      to: "/orgs/$orgId/competitions/$competitionId/setup" as const,
      params,
    };
  }
  return {
    to: "/orgs/$orgId/competitions/$competitionId" as const,
    params,
  };
}
