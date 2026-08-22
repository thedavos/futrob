import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";

const STEPS = [
  {
    label: "Crea tu organización",
    caption: "El espacio desde el que gestionas competiciones y equipos.",
  },
  {
    label: "Define tu primera competición",
    caption: "Formato, jornadas y reglas del torneo.",
  },
  {
    label: "Invita a los equipos",
    caption: "Los capitanes confirman sus plantillas para jugar.",
  },
] as const;

/**
 * Onboarding intro (MVP móvil). Paridad de flujo con web: tras el registro
 * se muestra la configuración inicial. Los pasos reales ya son alcanzables
 * vía `getFutrobClient()` (organizations, competitions, teams); esta pantalla
 * los presenta y continúa al home.
 */
export default function OnboardingWelcomeScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing[8], maxWidth: 400, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", gap: theme.spacing[4] }}>
          <Logo height={64} accessibilityLabel="Futrob" />
          <Text role="heading">Configura tu espacio</Text>
          <Text role="subtitle" color="muted-foreground" style={{ textAlign: "center" }}>
            Tres pasos para dejar tu competencia lista.
          </Text>
        </View>

        <View style={{ gap: theme.spacing[5] }}>
          {STEPS.map((step, index) => (
            <View key={step.label} style={{ flexDirection: "row", gap: theme.spacing[4] }}>
              <Text role="score" color="primary">
                {index + 1}
              </Text>
              <View style={{ flex: 1, gap: theme.spacing[1] }}>
                <Text role="label">{step.label}</Text>
                <Text role="caption" color="muted-foreground">
                  {step.caption}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button label="Comenzar" onPress={() => router.replace("/(home)")} />
      </View>
    </Screen>
  );
}
