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

export function formatOrganizationRelativeTime(at: Date, locale: string, now = new Date()): string {
  const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return relative.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
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
