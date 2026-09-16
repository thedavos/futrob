import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, EmptyState, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { logout } from "@/modules/identity/session-lifecycle";
import {
  LOGIN_ROUTE,
  loadAuthenticatedShell,
  type HomeShellSnapshot,
} from "@/modules/authorization/load-authenticated-shell";

export default function HomeScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<HomeShellSnapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reloadAccess = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAuthenticatedShell()
      .then((next) => {
        if (cancelled) {
          return;
        }
        if (next.kind === "login") {
          router.replace(next.destination);
          return;
        }
        setSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(LOGIN_ROUTE);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, router]);

  async function handleLogout() {
    await logout(() => {
      router.replace(LOGIN_ROUTE);
    });
  }

  if (!snapshot) {
    return <View style={{ flex: 1 }} />;
  }

  const firstName = snapshot.session.user.name.trim().split(/\s+/)[0];

  return (
    <Screen>
      <View style={{ flex: 1, gap: theme.spacing[6] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[3] }}>
          <Logo height={32} />
          <Text role="label" color="muted-foreground">
            Futrob
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing[4] }}>
          <EmptyState
            title={firstName ? `Hola, ${firstName}` : "Hola"}
            description={
              snapshot.accessRetryable
                ? "No se pudieron cargar tus permisos. Las acciones que requieren permiso están ocultas."
                : "Aún no hay nada por aquí. Cuando te unas a una organización verás tus competiciones, partidos y estadísticas."
            }
            action={
              snapshot.accessRetryable ? (
                <Button label="Reintentar" onPress={reloadAccess} />
              ) : undefined
            }
          />
          {snapshot.onboarding !== null ? (
            <Text
              role="caption"
              color="muted-foreground"
              style={{ textAlign: "center", marginTop: theme.spacing[4] }}
            >
              {snapshot.onboarding.completed
                ? "Onboarding completado."
                : `Onboarding pendiente: ${snapshot.onboarding.currentStep ?? "sin iniciar"}.`}
            </Text>
          ) : null}
          {snapshot.nav.map((item) => (
            <Text key={item.id} role="label" style={{ textAlign: "center" }}>
              {item.label}
            </Text>
          ))}
          {snapshot.commands.map((command) => (
            <Text key={command.id} role="label" style={{ textAlign: "center" }}>
              {command.label}
            </Text>
          ))}
        </View>

        <Button variant="ghost" label="Cerrar sesión" onPress={handleLogout} />
      </View>
    </Screen>
  );
}
