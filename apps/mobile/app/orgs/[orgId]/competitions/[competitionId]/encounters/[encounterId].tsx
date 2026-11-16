import { useLocalSearchParams } from "expo-router";
import { MatchCenterScreen } from "@/modules/match-center/match-center-screen";

/** Same path as web's Encounter page; deep links and the player's next Encounter land here. */
export default function EncounterRoute() {
  const { orgId, competitionId, encounterId } = useLocalSearchParams<{
    orgId: string;
    competitionId: string;
    encounterId: string;
  }>();
  return (
    <MatchCenterScreen
      key={`${orgId}/${competitionId}/${encounterId}`}
      organizationId={orgId}
      competitionId={competitionId}
      encounterId={encounterId}
    />
  );
}
