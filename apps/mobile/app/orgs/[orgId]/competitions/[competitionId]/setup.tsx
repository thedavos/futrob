import { useLocalSearchParams } from "expo-router";
import { NativeDestination } from "@/modules/authorization/native-destination";

export default function CompetitionSetupRoute() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return (
    <NativeDestination
      destination={{ kind: "competition", organizationId: orgId, competitionId, setup: true }}
    />
  );
}
