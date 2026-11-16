import { useLocalSearchParams } from "expo-router";
import { MoreScreen } from "@/modules/navigation/more-screen";

export default function MoreRoute() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return <MoreScreen context={{ kind: "competition", organizationId: orgId, competitionId }} />;
}
