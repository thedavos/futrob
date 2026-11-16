import { useLocalSearchParams } from "expo-router";
import { ContextTabsLayout } from "@/modules/navigation/context-tabs-layout";

export default function OrganizationTabsLayout() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  return <ContextTabsLayout context={{ kind: "organization", organizationId: orgId }} />;
}
