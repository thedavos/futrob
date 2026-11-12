import { useGlobalSearchParams } from "expo-router";
import { useExternalSync } from "@futrob/ui/hooks/use-external-sync";
import { ContextTabsLayout } from "@/modules/navigation/context-tabs-layout";
import {
  rememberPersonalClub,
  useRememberedPersonalClub,
} from "@/modules/navigation/personal-club";

export default function PersonalTabsLayout() {
  // `club` belongs to the focused personal route (Inicio); other tabs use the remembered club.
  const { club } = useGlobalSearchParams<{ club?: string }>();
  const remembered = useRememberedPersonalClub();
  // A club opened by link is as explicit as one chosen in the selector: keep it for the session
  // so switching tabs never changes it.
  useExternalSync(() => {
    if (club) rememberPersonalClub(club);
  }, [club]);
  return <ContextTabsLayout context={{ kind: "personal", externalClubId: club || remembered }} />;
}
