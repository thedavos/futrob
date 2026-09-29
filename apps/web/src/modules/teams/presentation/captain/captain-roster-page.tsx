"use client";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useSearchClubsMutation } from "@/modules/game-data/presentation/game-data-queries.ts";
import {
  useChangeRosterRoleMutation,
  useConnectExternalClubMutation,
  useSetRosterOpenMutation,
} from "../competition-team-queries.ts";
import { teamConsoleError } from "../team-console-error.ts";
import { captainLinks } from "./captain-links.tsx";
import { CaptainRosterPageView } from "./captain-roster-page-view.tsx";
import { useCaptainTeam } from "./use-captain-team.ts";
import { useCaptainTeamDetail } from "./use-captain-team-detail.ts";

export function CaptainRosterPage({
  competitionId,
  organizationId,
}: Readonly<{ competitionId: string; organizationId: string | null }>) {
  const { t } = useI18n();
  const { access, capabilities, retry } = useCaptainTeam({
    competitionId,
    organizationId,
    required: "manageRoster",
  });
  const { scope, detail } = useCaptainTeamDetail(access);
  const changeRole = useChangeRosterRoleMutation(scope);
  const setRosterOpen = useSetRosterOpenMutation(scope);
  const connectClub = useConnectExternalClubMutation(scope);
  const searchClubs = useSearchClubsMutation();
  const error =
    detail.error ??
    changeRole.error ??
    setRosterOpen.error ??
    connectClub.error ??
    searchClubs.error;

  /** Each new action starts clean, so an earlier failure doesn't outlive a later success. */
  function clearActionErrors() {
    changeRole.reset();
    setRosterOpen.reset();
    connectClub.reset();
    searchClubs.reset();
  }

  return (
    <CaptainRosterPageView
      access={access}
      busy={changeRole.isPending || setRosterOpen.isPending || connectClub.isPending}
      capabilities={capabilities}
      detail={detail.data ?? null}
      error={error ? teamConsoleError(error, t) : null}
      links={captainLinks(organizationId, competitionId)}
      onChangeRole={async (membershipId, role) => {
        clearActionErrors();
        await changeRole.mutateAsync({ membershipId, role });
      }}
      onConnectClub={async (club) => {
        clearActionErrors();
        await connectClub.mutateAsync({
          providerKey: club.providerKey,
          externalClubId: club.externalClubId,
          externalClubName: club.name,
          platform: club.platform,
          gameEdition: club.gameEdition,
        });
      }}
      onRetry={retry}
      onRetryDetail={() => {
        clearActionErrors();
        void detail.refetch();
      }}
      onSearchClubs={async (query) => {
        clearActionErrors();
        const result = await searchClubs.mutateAsync({ query, providerKey: "ea-clubs" });
        return result.clubs;
      }}
      onSetRosterOpen={async (open) => {
        clearActionErrors();
        await setRosterOpen.mutateAsync(open);
      }}
    />
  );
}
