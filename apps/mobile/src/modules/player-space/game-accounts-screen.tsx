import { useState } from "react";
import { View } from "react-native";
import type { GamePlatformDto, PlayerGameAccountDto } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { theme } from "@/theme/theme";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Text,
} from "@/ui";
import { playerSpaceCopy } from "./player-space-copy";
import { isUnauthorized, usePlayerProfile, useSaveGameAccount } from "./player-space-data";
import { LoginRedirect } from "./player-space-states";

type Copy = ReturnType<typeof playerSpaceCopy>;

const PLATFORMS = [
  "playstation",
  "xbox",
  "pc",
  "nintendo-switch-1",
  "nintendo-switch-2",
] as const satisfies readonly GamePlatformDto[];

/** `null`: closed; `{ account: undefined }`: adding; otherwise editing that account. */
type Editing = { readonly account: PlayerGameAccountDto | undefined } | null;

/**
 * Cuentas de juego: the EA identifiers that recognize the player in their clubs' matches. As
 * on web, an identifier can be added or edited; its associated clubs never change with it.
 */
export function GameAccountsScreen() {
  const { language } = useMobileCopy();
  const copy = playerSpaceCopy(language);
  const profile = usePlayerProfile();
  const [editing, setEditing] = useState<Editing>(null);

  if (isUnauthorized(profile.error)) return <LoginRedirect />;

  function body() {
    if (profile.isError) {
      return (
        <ErrorState
          title={copy.gameAccounts.error}
          description={copy.matches.errorDescription}
          retryLabel={copy.retry}
          retrying={profile.isFetching}
          onRetry={() => void profile.refetch()}
        />
      );
    }
    if (!profile.data) return <LoadingState label={copy.gameAccounts.loading} />;
    const accounts = profile.data.gameAccounts;
    const add = (
      <Button
        variant={accounts.length === 0 ? "primary" : "secondary"}
        label={copy.gameAccounts.add}
        onPress={() => setEditing({ account: undefined })}
      />
    );
    if (accounts.length === 0) {
      return (
        <EmptyState
          title={copy.gameAccounts.emptyTitle}
          description={copy.gameAccounts.emptyDescription}
          action={add}
        />
      );
    }
    return (
      <>
        <List>
          {accounts.map((account) => (
            <ListItem
              key={account.id}
              title={account.identifier}
              description={`${copy.platforms[account.platform]} · ${account.gameEdition.toUpperCase()}`}
              accessibilityHint={copy.gameAccounts.edit(account.identifier)}
              onPress={() => setEditing({ account })}
            />
          ))}
        </List>
        <View style={{ alignItems: "flex-start" }}>{add}</View>
      </>
    );
  }

  return (
    <StackFrame title={copy.gameAccounts.title} fallbackHref="/player/more">
      <Text color="muted-foreground">{copy.gameAccounts.description}</Text>
      {body()}
      {editing ? (
        <GameAccountDialog
          key={editing.account?.id ?? "new"}
          account={editing.account}
          copy={copy}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </StackFrame>
  );
}

function saveError(error: Error, copy: Copy): string {
  if (error instanceof FutrobApiError) {
    if (error.code === "teams.game_account_conflict") return copy.gameAccounts.conflict;
    if (error.code === "teams.game_account_not_found") return copy.gameAccounts.missing;
  }
  return copy.gameAccounts.saveFailed;
}

function GameAccountDialog({
  account,
  copy,
  onClose,
}: {
  account: PlayerGameAccountDto | undefined;
  copy: Copy;
  onClose: () => void;
}) {
  const save = useSaveGameAccount();
  const [identifier, setIdentifier] = useState(account?.identifier ?? "");
  const [platform, setPlatform] = useState<GamePlatformDto | undefined>(account?.platform);
  const [gameEdition, setGameEdition] = useState(account?.gameEdition ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  function submit() {
    const input = {
      identifier: identifier.trim(),
      gameEdition: gameEdition
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, ""),
    };
    if (!input.identifier || !input.gameEdition || platform === undefined) {
      setProblem(copy.gameAccounts.required);
      return;
    }
    setProblem(null);
    save.mutate(
      { accountId: account?.id, input: { ...input, platform } },
      { onSuccess: onClose, onError: (error) => setProblem(saveError(error, copy)) },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={account ? copy.gameAccounts.editTitle : copy.gameAccounts.addTitle}
      description={account ? copy.gameAccounts.editDescription : copy.gameAccounts.description}
      closeLabel={copy.gameAccounts.close}
      actions={<Button label={copy.gameAccounts.save} loading={save.isPending} onPress={submit} />}
    >
      <View style={{ gap: theme.spacing[4] }}>
        <Input
          label={copy.gameAccounts.identifier}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={80}
          editable={!save.isPending}
        />
        <ListSection title={copy.gameAccounts.platform}>
          <List label={copy.gameAccounts.platform}>
            {PLATFORMS.map((option) => (
              <ListItem
                key={option}
                title={copy.platforms[option]}
                selected={platform === option}
                disabled={save.isPending}
                onPress={() => setPlatform(option)}
              />
            ))}
          </List>
        </ListSection>
        <Input
          label={copy.gameAccounts.edition}
          value={gameEdition}
          onChangeText={setGameEdition}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          editable={!save.isPending}
        />
        {problem ? (
          <Text role="caption" color="destructive" accessibilityRole="alert">
            {problem}
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}
