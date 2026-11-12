import { useLocalSearchParams } from "expo-router";
import { ExploreDetailScreen } from "@/modules/player-space/explore-screens";

export default function ExploreDetailRoute() {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  return <ExploreDetailScreen key={competitionId} competitionId={competitionId} />;
}
