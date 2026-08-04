import { createFileRoute } from "@tanstack/react-router";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { LoginForm } from "@/modules/identity/presentation/login-form.tsx";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: resolveSafeRedirect(
      typeof search.redirectTo === "string" ? search.redirectTo : null,
    ),
  }),
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
  const { redirectTo } = Route.useSearch();
  return (
    <>
      <div className="mb-8">
        <AuthFormHeader description="Continúa gestionando tu competición." title="Inicia sesión" />
      </div>
      <LoginForm redirectTo={redirectTo} />
    </>
  );
}
