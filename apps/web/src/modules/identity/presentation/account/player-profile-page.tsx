import type { PlayerGameAccountDto } from "@futrob/api-contracts";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  SectionTitle,
  Text,
  TextLink,
} from "@futrob/ui";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useMyPlayerProfileQuery } from "@/modules/teams/presentation/player-queries.ts";
import { platformLabel } from "@/modules/teams/presentation/platform-label.ts";
import { formatProviderGameEdition } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ProfileEditor, type ProfileIdentity } from "./profile-editor.tsx";
import { styles } from "./account.styles.ts";

export function PlayerProfilePage() {
  const session = authClient.useSession();
  const profile = useMyPlayerProfileQuery();
  const user = session.data?.user;
  return (
    <PlayerProfilePageView
      identity={
        session.isPending
          ? { status: "pending" }
          : user
            ? {
                status: "ready",
                user,
                save: async (name) => {
                  const result = await authClient.updateUser({ name });
                  if (result.error) throw new Error(result.error.code ?? "update_user_failed");
                  await session.refetch();
                },
              }
            : { status: "error" }
      }
      accounts={
        profile.isPending
          ? { status: "pending" }
          : profile.isError
            ? { status: "error", retry: () => void profile.refetch() }
            : { status: "ready", items: profile.data.gameAccounts }
      }
    />
  );
}

type IdentityState =
  | { readonly status: "pending" | "error" }
  | {
      readonly status: "ready";
      readonly user: ProfileIdentity;
      readonly save: (name: string) => Promise<void>;
    };
type AccountsState =
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "ready"; readonly items: readonly PlayerGameAccountDto[] };

export function PlayerProfilePageView({
  identity,
  accounts,
}: {
  readonly identity: IdentityState;
  readonly accounts: AccountsState;
}) {
  const { t } = useI18n();
  return (
    <div {...applyStyles(styles.page)}>
      <PageHeader>
        <PageHeaderTitle>{t("profile.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("profile.description")}</PageHeaderDescription>
      </PageHeader>
      {identity.status === "pending" ? (
        <p role="status">
          <Caption>{t("profile.loading")}</Caption>
        </p>
      ) : identity.status === "ready" ? (
        <ProfileEditor identity={identity.user} save={identity.save} />
      ) : (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t("profile.loadError")}</AlertDescription>
        </Alert>
      )}
      <section {...applyStyles(styles.section)} aria-labelledby="profile-games">
        <SectionTitle id="profile-games">{t("profile.games")}</SectionTitle>
        {accounts.status === "pending" ? (
          <Caption>{t("profile.loading")}</Caption>
        ) : accounts.status === "error" ? (
          <Alert variant="destructive">
            <AlertDescription>{t("profile.gamesError")}</AlertDescription>
            <Button onClick={accounts.retry} variant="outline">
              {t("account.retry")}
            </Button>
          </Alert>
        ) : accounts.items.length ? (
          <ul {...applyStyles(styles.section)}>
            {accounts.items.map((account) => (
              <li key={account.id}>
                <Text as="p">{account.identifier}</Text>
                <Caption>
                  {platformLabel(account.platform)} ·{" "}
                  {formatProviderGameEdition(account.gameEdition)}
                </Caption>
              </li>
            ))}
          </ul>
        ) : (
          <Caption>{t("profile.gamesEmpty")}</Caption>
        )}
        <div {...applyStyles(styles.actions)}>
          <TextLink render={<Link to="/player/game-accounts" />}>{t("profile.gameData")}</TextLink>
          <TextLink render={<Link to="/player/statistics" />}>{t("profile.statistics")}</TextLink>
        </div>
      </section>
    </div>
  );
}
