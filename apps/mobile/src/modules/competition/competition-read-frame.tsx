import type { ReactNode } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { useContextAccessQuery } from "@/modules/navigation/use-context-access";
import { theme } from "@/theme/theme";
import { Button, EmptyState, ErrorState, LoadingState, Screen, Text } from "@/ui";
import { competitionCopy, type CompetitionCopy } from "./competition-copy";
import { isRefused, type CompetitionScope, type Refused } from "./competition-queries";

export function useCompetitionCopy(): CompetitionCopy & { readonly locale: string } {
  const { language } = useMobileCopy();
  return { ...competitionCopy(language), locale: language };
}

export function useCompetitionScope(): CompetitionScope {
  const { orgId, competitionId } = useLocalSearchParams<{ orgId: string; competitionId: string }>();
  return { organizationId: orgId, competitionId };
}

export function competitionHref(scope: CompetitionScope, path = ""): string {
  return `/orgs/${encodeURIComponent(scope.organizationId)}/competitions/${encodeURIComponent(
    scope.competitionId,
  )}${path}`;
}

/** A read view inside the competition's tab shell, which already pads top and bottom. */
export function CompetitionTabScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen scroll edges={["left", "right"]} centered={false}>
      <View style={{ gap: theme.spacing[5] }}>
        <Text role="heading" accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
    </Screen>
  );
}

/**
 * A read view stacked above the shell (opened from «Más» or a row). Back returns to the
 * previous screen, or to the competition when the screen was opened from a deep link.
 */
export function CompetitionStackScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const scope = useCompetitionScope();
  const copy = useCompetitionCopy();
  return (
    <GateBoundary mode="ready">
      <Screen scroll centered={false}>
        <View style={{ gap: theme.spacing[5] }}>
          <View style={{ alignItems: "flex-start" }}>
            <Button
              variant="ghost"
              label={copy.back}
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace(nativeRoute(competitionHref(scope)))
              }
            />
          </View>
          <Text role="heading" accessibilityRole="header">
            {title}
          </Text>
          {children}
        </View>
      </Screen>
    </GateBoundary>
  );
}

type ReadCopy = { readonly loading: string; readonly error: string; readonly refreshError: string };

/**
 * Loading, error, refusal and data are distinct states. Data that is already on screen stays
 * there when a refresh fails, with a notice and a retry, as the web read views do.
 */
export function ReadState<T extends object>({
  query,
  copy,
  forbidden,
  children,
}: {
  query: Pick<
    UseQueryResult<T | Refused>,
    "data" | "isPending" | "isError" | "isFetching" | "refetch"
  >;
  copy: ReadCopy;
  /** Overrides the generic refusal copy, e.g. statistics access. */
  forbidden?: { readonly title: string; readonly description: string };
  children: (data: T) => ReactNode;
}) {
  const shared = useCompetitionCopy();
  const retry = () => void query.refetch();
  if (query.data === undefined) {
    if (query.isError) {
      return (
        <ErrorState
          title={copy.error}
          retryLabel={shared.retry}
          onRetry={retry}
          retrying={query.isFetching}
        />
      );
    }
    return <LoadingState label={copy.loading} />;
  }
  if (isRefused(query.data)) {
    const refusal =
      query.data.refused === "forbidden" ? (forbidden ?? shared.forbidden) : shared.notFound;
    return <EmptyState title={refusal.title} description={refusal.description} />;
  }
  return (
    <>
      {query.isError ? <RefreshNotice message={copy.refreshError} onRetry={retry} /> : null}
      {children(query.data)}
    </>
  );
}

export function RefreshNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  const copy = useCompetitionCopy();
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[3] }}
    >
      <Text role="caption" color="muted-foreground" style={{ flex: 1 }}>
        {message}
      </Text>
      <Button variant="outline" label={copy.retry} onPress={onRetry} />
    </View>
  );
}

/**
 * `EffectiveAccess` decides before a gated read is sent, as on web: a read the actor may not
 * make shows the refusal without calling the API; an unknown decision is never «allowed».
 */
export function AccessGate({
  scope,
  permission,
  loadingLabel,
  forbidden,
  children,
}: {
  scope: CompetitionScope;
  permission: string;
  loadingLabel: string;
  forbidden: { readonly title: string; readonly description: string };
  children: ReactNode;
}) {
  const copy = useCompetitionCopy();
  const access = useContextAccessQuery({ kind: "competition", ...scope });
  if (access.data === undefined) {
    if (access.isError) {
      return (
        <ErrorState
          title={copy.accessError}
          retryLabel={copy.retry}
          onRetry={() => void access.refetch()}
          retrying={access.isFetching}
        />
      );
    }
    return <LoadingState label={loadingLabel} />;
  }
  if (!access.data.has(permission)) {
    return <EmptyState title={forbidden.title} description={forbidden.description} />;
  }
  return <>{children}</>;
}

export function formatDateTime(iso: string, locale: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(locale, options).format(new Date(iso));
}
