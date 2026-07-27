import { createFileRoute } from "@tanstack/react-router";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { LoginForm } from "@/modules/identity/presentation/login-form.tsx";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión | Futrob" },
      {
        name: "description",
        content: "Inicia sesión en Futrob para continuar gestionando tus competiciones.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <>
      <AuthFormHeader description="Continúa gestionando tu competición." title="Inicia sesión" />
      <LoginForm />
    </>
  );
}
