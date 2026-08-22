import { useState } from "react";
import { Text as RNText, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Input, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { signInEmail, AuthError, AUTH_ERROR_GENERIC } from "@/modules/identity/auth-api";
import { saveSession } from "@/modules/identity/session-store";
import { validateEmail, validatePassword } from "@/modules/identity/auth-validation";

interface FieldErrors {
  email?: string | null;
  password?: string | null;
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    const errors: FieldErrors = {
      email: validateEmail(email.trim()),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const session = await signInEmail({ email: email.trim(), password });
      await saveSession(session);
      router.replace("/(home)");
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : AUTH_ERROR_GENERIC);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing[8], maxWidth: 400, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", gap: theme.spacing[4] }}>
          <Logo height={72} accessibilityLabel="Futrob" />
          <Text role="heading">Bienvenido de nuevo</Text>
          <Text role="subtitle" color="muted-foreground" style={{ textAlign: "center" }}>
            Ingresa a tu cuenta para gestionar tus competiciones.
          </Text>
        </View>

        {formError ? (
          <View
            accessibilityRole="alert"
            style={{
              borderRadius: theme.corner.md,
              borderWidth: 1,
              borderColor: theme.colors.danger,
              backgroundColor: `${theme.colors.danger}1a`,
              paddingHorizontal: theme.spacing[3],
              paddingVertical: theme.spacing[2],
            }}
          >
            <Text role="caption" color="danger">
              {formError}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: theme.spacing[4] }}>
          <Input
            label="Correo electrónico"
            placeholder="ejemplo@correo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!submitting}
            error={fieldErrors.email}
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            editable={!submitting}
            error={fieldErrors.password}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={{ gap: theme.spacing[6] }}>
          <Button label="Iniciar sesión" loading={submitting} onPress={handleLogin} />

          <Text role="caption" color="muted-foreground" style={{ textAlign: "center" }}>
            ¿Aún no tienes cuenta?{" "}
            <RNText
              onPress={() => router.push("/(auth)/signup")}
              style={{
                fontFamily: theme.fontFamily.medium,
                color: theme.colors.foreground,
                textDecorationLine: "underline",
              }}
            >
              Crear una cuenta
            </RNText>
          </Text>
        </View>
      </View>
    </Screen>
  );
}
