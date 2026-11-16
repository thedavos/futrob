import { useLocalSearchParams } from "expo-router";
import { OrganizationMembersScreen } from "@/modules/team-organization/organization-members-screen";

export default function OrganizationMembersRoute() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  return <OrganizationMembersScreen organizationId={orgId} />;
}
