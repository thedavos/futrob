import { useLocalSearchParams } from "expo-router";
import { OrganizationSettingsScreen } from "@/modules/team-organization/organization-settings-screen";

export default function OrganizationSettingsRoute() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  return <OrganizationSettingsScreen organizationId={orgId} />;
}
