import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { logout } from "@/modules/identity/session-lifecycle";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import { PlayerHomeScreen } from "@/modules/player-home/player-home-screen";
import { Button, EmptyState, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { MOBILE_PERMISSION } from "./permissions.ts";
import {
  isUnauthorizedDestination,
  useNativeDestination,
  type Destination,
} from "./use-native-destination.ts";

export function NativeDestination({ destination }: { destination: Destination }) {
  return (
    <GateBoundary mode="ready">
      <NativeDestinationBody destination={destination} />
    </GateBoundary>
  );
}

function NativeDestinationBody({ destination }: { destination: Destination }) {
  const router = useRouter();
  const { language, toggleLanguage } = useMobileCopy();
  const query = useNativeDestination(destination);
  const data = query.data;
  const orgId = "organizationId" in destination ? destination.organizationId : undefined;
  const competitionId = "competitionId" in destination ? destination.competitionId : undefined;
  const go = (route: string) => router.push(nativeRoute(route));
  const label = (es: string, en: string) => (language === "es" ? es : en);
  const organization = data?.memberships.find((item) => item.organizationId === orgId);
  const competition = data?.competitions.find(
    (item) => item.id === competitionId && item.organizationId === orgId,
  );

  if (isUnauthorizedDestination(query.error ?? null)) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  return (
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
        {query.isError ? (
          <EmptyState
            title={label("No pudimos cargar este espacio", "We couldn't load this space")}
            action={
              <Button label={label("Reintentar", "Retry")} onPress={() => void query.refetch()} />
            }
          />
        ) : !data ? (
          <Text>{label("Cargando…", "Loading…")}</Text>
        ) : (
          <>
            {destination.kind === "player" ? (
              <PlayerHomeScreen language={language} />
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
                {destination.setup && data.permissions.has(MOBILE_PERMISSION.competitionsUpdate) ? (
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
                    onPress={() => void query.refetch()}
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
  );
}
