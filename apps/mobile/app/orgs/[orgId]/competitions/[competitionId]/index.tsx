import { useLocalSearchParams } from "expo-router";
import { NativeDestination } from "@/modules/authorization/native-destination";

export default function CompetitionRoute() {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return (
    <NativeDestination
      destination={{ kind: "competition", organizationId: orgId, competitionId }}
    />
  );
}
