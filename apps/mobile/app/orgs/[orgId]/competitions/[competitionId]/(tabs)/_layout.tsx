import { useLocalSearchParams } from "expo-router";
import { ContextTabsLayout } from "@/modules/navigation/context-tabs-layout";

export default function CompetitionTabsLayout() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return (
    <ContextTabsLayout context={{ kind: "competition", organizationId: orgId, competitionId }} />
  );
}
