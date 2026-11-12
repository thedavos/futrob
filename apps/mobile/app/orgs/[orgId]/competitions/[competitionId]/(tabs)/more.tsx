import { useLocalSearchParams } from "expo-router";
import { CompetitionDisputesLink } from "@/modules/match-center/competition-disputes-link";
import { MoreScreen } from "@/modules/navigation/more-screen";

export default function MoreRoute() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return (
    <MoreScreen
      destinations={
        <CompetitionDisputesLink organizationId={orgId} competitionId={competitionId} />
      }
    />
  );
}
