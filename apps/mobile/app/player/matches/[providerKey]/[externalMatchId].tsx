import { Redirect, useLocalSearchParams } from "expo-router";
import { MatchDetailScreen } from "@/modules/player-space/match-detail-screen";

const PROVIDER_KEYS = ["ea-clubs", "manual", "screenshot-ocr"] as const;
type ProviderKey = (typeof PROVIDER_KEYS)[number];

function isProviderKey(value: string | undefined): value is ProviderKey {
  return PROVIDER_KEYS.some((key) => key === value);
}

export default function MatchDetailRoute() {
  const { providerKey, externalMatchId } = useLocalSearchParams<{
    providerKey: string;
    externalMatchId: string;
  }>();
  if (!isProviderKey(providerKey) || !externalMatchId) return <Redirect href="/player/matches" />;
  return (
    <MatchDetailScreen
      key={`${providerKey}/${externalMatchId}`}
      providerKey={providerKey}
      externalMatchId={externalMatchId}
    />
  );
}
