import { createFileRoute } from "@tanstack/react-router";
import { PlayerActivityPage } from "@/modules/notifications/presentation/organization-activity-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/player_/activity")({
  head: localizedHead("activity.page.title"),
  component: PlayerActivityPage,
});
