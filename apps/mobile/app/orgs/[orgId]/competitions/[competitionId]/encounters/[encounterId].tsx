import { useLocalSearchParams } from "expo-router";
import { ScheduleChangesScreen } from "@/modules/scheduling/schedule-changes-screen";

/** Same path as web's Encounter page; deep links and the player's next Encounter land here. */
export default function EncounterRoute() {
  const { orgId, competitionId, encounterId } = useLocalSearchParams<{
    orgId: string;
    competitionId: string;
    encounterId: string;
  }>();
  return (
    <ScheduleChangesScreen
      key={`${orgId}/${competitionId}/${encounterId}`}
      organizationId={orgId}
      competitionId={competitionId}
      encounterId={encounterId}
    />
  );
}
