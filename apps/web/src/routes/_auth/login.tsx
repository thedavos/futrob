import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { LoginForm } from "@/modules/identity/presentation/login-form.tsx";
import { sanitizePostAuthRedirect } from "@/shared/presentation/auth/post-auth-redirect.ts";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search) =>
    loginSearchSchema.parse({
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
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
  const { redirect: rawRedirect } = Route.useSearch();
  const redirect = sanitizePostAuthRedirect(rawRedirect);

  return (
    <>
      <div className="mb-8">
        <AuthFormHeader description="Continúa gestionando tu competición." title="Inicia sesión" />
      </div>
      <LoginForm redirect={redirect} />
    </>
  );
}
