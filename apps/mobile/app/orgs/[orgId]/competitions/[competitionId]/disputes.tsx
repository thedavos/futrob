import { useLocalSearchParams } from "expo-router";
import { CompetitionDisputesScreen } from "@/modules/match-center/competition-disputes-screen";

/** Same path as web's competition disputes page. */
export default function DisputesRoute() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return (
    <CompetitionDisputesScreen
      key={`${orgId}/${competitionId}`}
      organizationId={orgId}
      competitionId={competitionId}
    />
  );
}
