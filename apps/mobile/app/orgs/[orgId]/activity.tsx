import { useLocalSearchParams } from "expo-router";
import { ActivityScreen } from "@/modules/team-organization/activity-screen";

export default function OrganizationActivityRoute() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  return <ActivityScreen organizationId={orgId} />;
}
