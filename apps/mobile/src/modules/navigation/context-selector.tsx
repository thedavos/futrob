import { useState } from "react";
import { Pressable, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import {
  isSameWorkspaceContext,
  resolvePersonalExternalClubId,
  workspaceContextName,
  workspaceContextPath,
  type WorkspaceContext,
  type WorkspaceOptions,
} from "@futrob/sdk";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { theme } from "@/theme/theme";
import {
  Dialog,
  ErrorState,
  Icon,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Logo,
  Text,
} from "@/ui";
import { navigationCopy } from "./navigation-copy";
import { rememberPersonalClub } from "./personal-club";
import { isUnauthorizedError, useWorkspaceOptions } from "./use-workspace-options";

/**
 * The single context selector (design.md, «Selector de contexto (único)»), always reachable
 * from the shell header. Choosing an item switches the whole context; switching tabs never
 * does. Opening it reads the actor's spaces again.
 */
export function ContextSelector({ context: requested }: { context: WorkspaceContext }) {
  const router = useRouter();
  const { language } = useMobileCopy();
  const copy = navigationCopy(language);
  const options = useWorkspaceOptions();
  const [open, setOpen] = useState(false);

  if (isUnauthorizedError(options.error)) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  const context = withDefaultClub(requested, options.data);
  const kindLabel = copy.context[context.kind];
  const name = workspaceContextName(context, options.data);
  const title = name ?? kindLabel;

  function select(next: WorkspaceContext) {
    setOpen(false);
    if (next.kind === "personal" && next.externalClubId) {
      rememberPersonalClub(next.externalClubId);
    }
    if (!isSameWorkspaceContext(next, context)) {
      router.replace(nativeRoute(workspaceContextPath(next)));
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.switchContext(title)}
        onPress={() => {
          setOpen(true);
          void options.refetch();
        }}
        style={({ pressed }) => ({
          minHeight: theme.controlHeight,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing[3],
          paddingHorizontal: theme.spacing[2],
          marginHorizontal: -theme.spacing[2],
          borderRadius: theme.corner.md,
          backgroundColor: pressed ? theme.colors.muted : "transparent",
        })}
      >
        <Logo height={28} />
        <View style={{ flex: 1 }}>
          {name ? (
            <Text role="caption" color="muted-foreground" numberOfLines={1}>
              {kindLabel}
            </Text>
          ) : null}
          <Text role="label" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Icon name="chevron-down" color="foreground" />
      </Pressable>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={copy.selectorTitle}
        closeLabel={copy.close}
      >
        {options.data ? (
          <ContextOptions
            context={context}
            options={options.data}
            language={language}
            onSelect={select}
          />
        ) : options.isError ? (
          <ErrorState
            title={copy.optionsErrorTitle}
            description={copy.optionsErrorDescription}
            retryLabel={copy.retry}
            retrying={options.isFetching}
            onRetry={() => void options.refetch()}
          />
        ) : (
          <LoadingState label={copy.optionsLoading} />
        )}
      </Dialog>
    </>
  );
}

/** Without a chosen club, the personal space is the first associated club (as on web). */
function withDefaultClub(
  context: WorkspaceContext,
  options: WorkspaceOptions | undefined,
): WorkspaceContext {
  if (context.kind !== "personal" || context.externalClubId || !options) return context;
  const externalClubId = resolvePersonalExternalClubId(
    undefined,
    options.clubs.map((club) => club.externalClubId),
  );
  return externalClubId ? { kind: "personal", externalClubId } : context;
}

function ContextOptions({
  context,
  options,
  language,
  onSelect,
}: {
  context: WorkspaceContext;
  options: WorkspaceOptions;
  language: "es" | "en";
  onSelect: (context: WorkspaceContext) => void;
}) {
  const copy = navigationCopy(language);
  const active = (candidate: WorkspaceContext) => isSameWorkspaceContext(candidate, context);
  // The chosen club is the personal space's active item; without one, the space itself is.
  const personalActive =
    context.kind === "personal" && !options.clubs.some((club) => active(club.context));

  return (
    <>
      <List>
        <ListItem
          title={copy.context.personal}
          selected={personalActive}
          onPress={() => onSelect({ kind: "personal" })}
        />
      </List>
      <ListSection title={copy.groups.competitions}>
        {options.competitions.length === 0 ? (
          <Text role="caption" color="text-tertiary">
            {copy.empty.competitions}
          </Text>
        ) : (
          <List>
            {options.competitions.map((item) => (
              <ListItem
                key={item.competitionId}
                title={item.name}
                description={copy.roles[item.role]}
                selected={active(item.context)}
                onPress={() => onSelect(item.context)}
              />
            ))}
          </List>
        )}
      </ListSection>
      <ListSection title={copy.groups.clubs}>
        {options.clubs.length === 0 ? (
          <Text role="caption" color="text-tertiary">
            {copy.empty.clubs}
          </Text>
        ) : (
          <List>
            {options.clubs.map((item) => (
              <ListItem
                key={item.externalClubId}
                title={item.name}
                selected={active(item.context)}
                onPress={() => onSelect(item.context)}
              />
            ))}
          </List>
        )}
      </ListSection>
      <ListSection title={copy.groups.organizations}>
        {options.organizations.length === 0 ? (
          <Text role="caption" color="text-tertiary">
            {copy.empty.organizations}
          </Text>
        ) : (
          <List>
            {options.organizations.map((item) => (
              <ListItem
                key={item.organizationId}
                title={item.name}
                description={copy.roles[item.role]}
                selected={active(item.context)}
                onPress={() => onSelect(item.context)}
              />
            ))}
          </List>
        )}
      </ListSection>
    </>
  );
}
