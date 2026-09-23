import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type {
  CompetitionDto,
  GetMyPlayerProfileResponse,
  MembershipSummaryDto,
} from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { logout } from "@/modules/identity/session-lifecycle";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { Button, EmptyState, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import {
  allowedPermissionSet,
  MOBILE_PERMISSION,
  SHELL_PERMISSIONS,
  scopeForDestination,
} from "./permissions.ts";

type Destination =
  | { kind: "player" }
  | { kind: "picker" }
  | { kind: "organization"; organizationId: string }
  | { kind: "competition"; organizationId: string; competitionId: string; setup?: boolean };

type DestinationData = {
  profile: GetMyPlayerProfileResponse | null;
  memberships: readonly MembershipSummaryDto[];
  competitions: readonly CompetitionDto[];
  permissions: ReadonlySet<string>;
  accessUnavailable: boolean;
};

async function loadDestination(destination: Destination): Promise<DestinationData> {
  const client = getFutrobClient();
  const [profile, mine, competitions] = await Promise.all([
    client.players.getProfile(),
    client.organizations.listMine(),
    client.competitions.listMine(),
  ]);
  const scope = scopeForDestination(destination);
  try {
    const access = await client.authorization.getEffectiveAccess(scope, SHELL_PERMISSIONS);
    return {
      profile,
      memberships: mine.memberships,
      competitions: competitions.competitions.map((entry) => entry.competition),
      permissions: allowedPermissionSet(access),
      accessUnavailable: false,
    };
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) throw error;
    return {
      profile,
      memberships: mine.memberships,
      competitions: competitions.competitions.map((entry) => entry.competition),
      permissions: new Set(),
      accessUnavailable: true,
    };
  }
}

export function NativeDestination({ destination }: { destination: Destination }) {
  const router = useRouter();
  const { language, toggleLanguage } = useMobileCopy();
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DestinationData | null>(null);
  const [error, setError] = useState(false);
  const onReady = useCallback(() => setRevision((value) => value + 1), []);
  const orgId = "organizationId" in destination ? destination.organizationId : undefined;
  const competitionId = "competitionId" in destination ? destination.competitionId : undefined;

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    void loadDestination(destination)
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof FutrobApiError && caught.status === 401) {
          router.replace(LOGIN_ROUTE);
        } else {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [destination.kind, orgId, competitionId, revision]);

  const go = (route: string) => router.push(nativeRoute(route));
  const label = (es: string, en: string) => (language === "es" ? es : en);
  const organization = data?.memberships.find((item) => item.organizationId === orgId);
  const competition = data?.competitions.find(
    (item) => item.id === competitionId && item.organizationId === orgId,
  );

  return (
    <GateBoundary mode="ready" onReady={onReady}>
      <Screen scroll>
        <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[3] }}>
            <Logo height={32} accessibilityLabel="Futrob" />
            <Text role="label">Futrob</Text>
          </View>
          <Button
            variant="ghost"
            label={language === "es" ? "English" : "Español"}
            onPress={toggleLanguage}
          />
          {error ? (
            <EmptyState
              title={label("No pudimos cargar este espacio", "We couldn't load this space")}
              action={
                <Button
                  label={label("Reintentar", "Retry")}
                  onPress={() => setRevision((value) => value + 1)}
                />
              }
            />
          ) : !data ? (
            <Text>{label("Cargando…", "Loading…")}</Text>
          ) : (
            <>
              {destination.kind === "player" ? (
                <>
                  <Text role="heading" accessibilityRole="header">
                    {label("Mi espacio", "My space")}
                  </Text>
                  {data.profile?.profile ? (
                    <>
                      <Text>
                        {label("Cuentas de juego", "Game accounts")}:{" "}
                        {data.profile.gameAccounts.length}
                      </Text>
                      <Text>
                        {label("Clubes EA", "EA clubs")}: {data.profile.externalClubs.length}
                      </Text>
                      {data.profile.externalClubs.map((club) => (
                        <Text key={`${club.providerKey}:${club.externalClubId}`}>
                          {club.externalClubName}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <EmptyState title={label("Perfil no disponible", "Profile unavailable")} />
                  )}
                </>
              ) : destination.kind === "picker" ? (
                <>
                  <Text role="heading" accessibilityRole="header">
                    {label("Tus organizaciones", "Your organizations")}
                  </Text>
                  {data.memberships.length === 0 ? (
                    <EmptyState title={label("Sin organizaciones", "No organizations")} />
                  ) : null}
                  {data.memberships.map((item) => (
                    <Button
                      key={item.organizationId}
                      variant="outline"
                      label={item.organizationName}
                      onPress={() => go(`/orgs/${encodeURIComponent(item.organizationId)}`)}
                    />
                  ))}
                </>
              ) : destination.kind === "organization" ? (
                <>
                  <Text role="heading" accessibilityRole="header">
                    {organization?.organizationName ?? label("Organización", "Organization")}
                  </Text>
                  {data.permissions.has(MOBILE_PERMISSION.competitionsRead)
                    ? data.competitions
                        .filter((item) => item.organizationId === orgId)
                        .map((item) => (
                          <Button
                            key={item.id}
                            variant="outline"
                            label={`${item.name} · ${item.status}`}
                            onPress={() =>
                              go(
                                `/orgs/${encodeURIComponent(orgId!)}/competitions/${encodeURIComponent(item.id)}`,
                              )
                            }
                          />
                        ))
                    : null}
                </>
              ) : (
                <>
                  <Text role="heading" accessibilityRole="header">
                    {competition?.name ?? label("Competición", "Competition")}
                  </Text>
                  {competition ? (
                    <Text color="muted-foreground">
                      {competition.gameEdition} · {competition.format} · {competition.status}
                    </Text>
                  ) : (
                    <EmptyState
                      title={label("Competición no disponible", "Competition unavailable")}
                    />
                  )}
                  {destination.setup &&
                  data.permissions.has(MOBILE_PERMISSION.competitionsUpdate) ? (
                    <Text>
                      {label(
                        "Borrador creado. Continúa su configuración desde Competiciones.",
                        "Draft created. Continue its setup from Competitions.",
                      )}
                    </Text>
                  ) : null}
                </>
              )}
              {data.accessUnavailable ? (
                <EmptyState
                  title={label("Permisos no disponibles", "Permissions unavailable")}
                  description={label(
                    "Las acciones protegidas están ocultas.",
                    "Protected actions are hidden.",
                  )}
                  action={
                    <Button
                      label={label("Reintentar", "Retry")}
                      onPress={() => setRevision((value) => value + 1)}
                    />
                  }
                />
              ) : null}
              {destination.kind !== "player" ? (
                <Button
                  variant="ghost"
                  label={label("Mi espacio", "My space")}
                  onPress={() => go("/player")}
                />
              ) : null}
              {data.memberships.length > 0 && destination.kind !== "picker" ? (
                <Button
                  variant="ghost"
                  label={label("Organizaciones", "Organizations")}
                  onPress={() => go("/orgs")}
                />
              ) : null}
            </>
          )}
          <Button
            variant="ghost"
            label={label("Cerrar sesión", "Sign out")}
            onPress={() => void logout(() => router.replace(LOGIN_ROUTE))}
          />
        </View>
      </Screen>
    </GateBoundary>
  );
}
