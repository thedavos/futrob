import { createFileRoute } from "@tanstack/react-router";
import { PlayerProfilePage } from "@/modules/identity/presentation/account/player-profile-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/player_/profile")({
  head: localizedHead("profile.title"),
  component: PlayerProfilePage,
});
