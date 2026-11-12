import { useRouter } from "expo-router";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { useContextAccess } from "@/modules/navigation/use-context-access";
import { List, ListItem } from "@/ui";
import { matchCenterCopy } from "./match-center-copy";

/**
 * «Disputas» in the competition's «Más», gated like web's nav item by
 * `encounters.results.approve`; hidden while access is unknown or failed.
 */
export function CompetitionDisputesLink({
  organizationId,
  competitionId,
}: {
  readonly organizationId: string;
  readonly competitionId: string;
}) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = matchCenterCopy(language);
  const allowed = useContextAccess({ kind: "competition", organizationId, competitionId });
  if (!allowed?.has(MOBILE_PERMISSION.encountersResultsApprove)) return null;
  return (
    <List>
      <ListItem
        title={copy.disputesTitle}
        description={copy.disputesDescription}
        onPress={() =>
          router.push(
            nativeRoute(
              `/orgs/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/disputes`,
            ),
          )
        }
      />
    </List>
  );
}
