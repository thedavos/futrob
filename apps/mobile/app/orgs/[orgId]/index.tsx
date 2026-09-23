import { useLocalSearchParams } from "expo-router";
import { NativeDestination } from "@/modules/authorization/native-destination";

export default function OrganizationRoute() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  return <NativeDestination destination={{ kind: "organization", organizationId: orgId }} />;
}
