import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { GateBoundary } from "@/modules/identity/gate-boundary";
import { logout } from "@/modules/identity/session-lifecycle";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { nativeRoute } from "@/modules/identity/native-route";
import type { CompetitionDto } from "@futrob/api-contracts";
import { playerHomeCopy } from "@/modules/player-home/player-home-copy";
import { PlayerHomeScreen } from "@/modules/player-home/player-home-screen";
import {
  Button,
  EmptyState,
  ErrorState,
  List,
  ListItem,
  ListSection,
  LoadingState,
  Logo,
  Screen,
  Text,
} from "@/ui";
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

/** The picker and competition setup are standalone stack screens; the rest live in a shell. */
function isStandalone(destination: Destination): boolean {
  return (
    destination.kind === "picker" || (destination.kind === "competition" && !!destination.setup)
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
  const statusLabel = playerHomeCopy(language).status;
  const organization = data?.memberships.find((item) => item.organizationId === orgId);
  const competition = data?.competitions.find(
    (item) => item.id === competitionId && item.organizationId === orgId,
  );
  const standalone = isStandalone(destination);

  if (isUnauthorizedDestination(query.error ?? null)) {
    return <Redirect href={LOGIN_ROUTE} />;
  }

  return (
    <Screen scroll edges={standalone ? undefined : ["left", "right"]} centered={standalone}>
      <View style={{ gap: theme.spacing[5], maxWidth: 520, width: "100%", alignSelf: "center" }}>
        {standalone ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[3] }}>
              <Logo height={32} accessibilityLabel="Futrob" />
              <Text role="label">Futrob</Text>
            </View>
            <Button
              variant="ghost"
              label={language === "es" ? "English" : "Español"}
              onPress={toggleLanguage}
            />
          </>
        ) : null}
        {query.isError ? (
          <ErrorState
            title={label("No pudimos cargar este espacio", "We couldn't load this space")}
            description={label(
              "Comprueba la conexión e inténtalo de nuevo.",
              "Check your connection and try again.",
            )}
            retryLabel={label("Reintentar", "Retry")}
            retrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        ) : !data ? (
          <LoadingState label={label("Cargando…", "Loading…")} />
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
                ) : (
                  <List>
                    {data.memberships.map((item) => (
                      <ListItem
                        key={item.organizationId}
                        title={item.organizationName}
                        onPress={() => go(`/orgs/${encodeURIComponent(item.organizationId)}`)}
                      />
                    ))}
                  </List>
                )}
              </>
            ) : destination.kind === "organization" ? (
              <>
                <Text role="heading" accessibilityRole="header">
                  {organization?.organizationName ?? label("Organización", "Organization")}
                </Text>
                {data.permissions.has(MOBILE_PERMISSION.competitionsRead) ? (
                  <OrganizationCompetitions
                    competitions={data.competitions.filter((item) => item.organizationId === orgId)}
                    title={label("Competiciones", "Competitions")}
                    emptyTitle={label("Sin competiciones todavía", "No competitions yet")}
                    statusLabel={statusLabel}
                    onOpen={(id) =>
                      go(
                        `/orgs/${encodeURIComponent(orgId!)}/competitions/${encodeURIComponent(id)}`,
                      )
                    }
                  />
                ) : null}
              </>
            ) : (
              <>
                <Text role="heading" accessibilityRole="header">
                  {competition?.name ?? label("Competición", "Competition")}
                </Text>
                {competition ? (
                  <Text color="muted-foreground">
                    {competition.gameEdition} · {competition.format} ·{" "}
                    {statusLabel[competition.status]}
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
            {standalone ? (
              <Button
                variant="ghost"
                label={label("Mi espacio", "My space")}
                onPress={() => go("/player")}
              />
            ) : null}
          </>
        )}
        {standalone ? (
          <>
            <Button
              variant="ghost"
              label={label("Cuenta", "Account")}
              onPress={() => go("/account")}
            />
            <Button
              variant="ghost"
              label={label("Cerrar sesión", "Sign out")}
              onPress={() => void logout(() => router.replace(LOGIN_ROUTE))}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function OrganizationCompetitions({
  competitions,
  title,
  emptyTitle,
  statusLabel,
  onOpen,
}: {
  competitions: readonly CompetitionDto[];
  title: string;
  emptyTitle: string;
  statusLabel: Record<CompetitionDto["status"], string>;
  onOpen: (competitionId: string) => void;
}) {
  return (
    <ListSection title={title}>
      {competitions.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <List>
          {competitions.map((item) => (
            <ListItem
              key={item.id}
              title={item.name}
              description={statusLabel[item.status]}
              onPress={() => onOpen(item.id)}
            />
          ))}
        </List>
      )}
    </ListSection>
  );
}
