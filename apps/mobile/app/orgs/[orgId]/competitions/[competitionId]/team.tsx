import { useLocalSearchParams } from "expo-router";
import { TeamRosterScreen } from "@/modules/team-organization/team-roster-screen";

export default function TeamRosterRoute() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return <TeamRosterScreen organizationId={orgId} competitionId={competitionId} />;
}
