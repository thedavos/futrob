import { useState } from "react";
import { Text as RNText, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Input, Logo, Screen, Text } from "@/ui";
import { theme } from "@/theme/theme";
import { signUpEmail, AuthError, AUTH_ERROR_GENERIC } from "@/modules/identity/auth-api";
import { saveSession } from "@/modules/identity/session-store";
import {
  validateEmail,
  validatePassword,
  validateRequired,
  AUTH_PASSWORD_HINT,
} from "@/modules/identity/auth-validation";

interface FieldErrors {
  name?: string | null;
  email?: string | null;
  password?: string | null;
}

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    const errors: FieldErrors = {
      name: validateRequired(name.trim()),
      email: validateEmail(email.trim()),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    if (errors.name || errors.email || errors.password) {
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const session = await signUpEmail({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      await saveSession(session);
      // Flow parity with web: signup continues into onboarding.
      router.replace("/(onboarding)/welcome");
    } catch (error) {
      if (error instanceof AuthError && error.code === "USER_ALREADY_EXISTS") {
        setFieldErrors({ email: error.message });
      } else {
        setFormError(error instanceof AuthError ? error.message : AUTH_ERROR_GENERIC);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing[8], maxWidth: 400, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", gap: theme.spacing[4] }}>
          <Logo height={72} accessibilityLabel="Futrob" />
          <Text role="heading">Crear una cuenta</Text>
          <Text role="subtitle" color="muted-foreground" style={{ textAlign: "center" }}>
            Únete para organizar competiciones o jugar con tu equipo.
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
            label="Nombre"
            placeholder="Tu nombre"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!submitting}
            error={fieldErrors.name}
            value={name}
            onChangeText={setName}
          />
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
            placeholder="Crea una contraseña"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
            error={fieldErrors.password}
            hint={AUTH_PASSWORD_HINT}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={{ gap: theme.spacing[6] }}>
          <Button label="Crear cuenta" loading={submitting} onPress={handleSignup} />

          <Text role="caption" color="muted-foreground" style={{ textAlign: "center" }}>
            ¿Ya tienes cuenta?{" "}
            <RNText
              onPress={() => router.push("/(auth)/login")}
              style={{
                fontFamily: theme.fontFamily.medium,
                color: theme.colors.foreground,
                textDecorationLine: "underline",
              }}
            >
              Iniciar sesión
            </RNText>
          </Text>
        </View>
      </View>
    </Screen>
  );
}
