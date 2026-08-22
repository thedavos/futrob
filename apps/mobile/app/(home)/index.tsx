import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, EmptyState, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { clearSession, getSession, type Session } from "@/modules/identity/session-store";
import { FutrobApiError, getFutrobClient } from "@/modules/api/futrob-client";

interface OnboardingStatus {
  completed: boolean;
  currentStep: string | null;
}

/**
 * Home inicial (MVP móvil): saluda, refleja el estado de onboarding vía
 * /api/v1 (Bearer) y permite cerrar sesión. El contenido de producto llega
 * con los módulos de organizaciones y competiciones.
 */
export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((value) => {
        if (!cancelled) {
          setSession(value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (checked && !session) {
      // Guard: stored session missing or unreadable → back to login.
      router.replace("/(auth)/login");
    }
  }, [checked, session, router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    getFutrobClient()
      .identity.getOnboardingStatus()
      .then((status) => {
        if (!cancelled) {
          setOnboarding({ completed: status.completed, currentStep: status.currentStep });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        // Expired/revoked session → force re-authentication.
        if (error instanceof FutrobApiError && error.status === 401) {
          void clearSession().then(() => router.replace("/(auth)/login"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, router]);

  async function handleLogout() {
    await clearSession();
    router.replace("/(auth)/login");
  }

  if (!session) {
    return <View style={{ flex: 1 }} />;
  }

  const firstName = session.user.name.trim().split(/\s+/)[0];

  return (
    <Screen>
      <View style={{ flex: 1, gap: theme.spacing[6] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing[3] }}>
          <Logo height={32} />
          <Text role="label" color="muted-foreground">
            Futrob
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title={firstName ? `Hola, ${firstName}` : "Hola"}
            description="Aún no hay nada por aquí. Cuando te unas a una organización verás tus competiciones, partidos y estadísticas."
          />
          {onboarding !== null ? (
            <Text
              role="caption"
              color="muted-foreground"
              style={{ textAlign: "center", marginTop: theme.spacing[4] }}
            >
              {onboarding.completed
                ? "Onboarding completado."
                : `Onboarding pendiente: ${onboarding.currentStep ?? "sin iniciar"}.`}
            </Text>
          ) : null}
        </View>

        <Button variant="ghost" label="Cerrar sesión" onPress={handleLogout} />
      </View>
    </Screen>
  );
}
