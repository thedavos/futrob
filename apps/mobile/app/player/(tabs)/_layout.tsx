import { useGlobalSearchParams } from "expo-router";
import { ContextTabsLayout } from "@/modules/navigation/context-tabs-layout";
import { useRememberedPersonalClub } from "@/modules/navigation/personal-club";

export default function PersonalTabsLayout() {
  // `club` belongs to the focused personal route (Inicio); other tabs use the remembered club.
  const { club } = useGlobalSearchParams<{ club?: string }>();
  const remembered = useRememberedPersonalClub();
  return <ContextTabsLayout context={{ kind: "personal", externalClubId: club || remembered }} />;
}
