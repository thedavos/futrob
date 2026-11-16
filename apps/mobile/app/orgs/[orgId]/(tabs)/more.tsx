import { useLocalSearchParams } from "expo-router";
import { MoreScreen } from "@/modules/navigation/more-screen";

export default function MoreRoute() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  return <MoreScreen context={{ kind: "organization", organizationId: orgId }} />;
}
