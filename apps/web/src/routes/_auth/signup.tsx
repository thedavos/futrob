import { createFileRoute } from "@tanstack/react-router";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { SignupForm } from "@/modules/identity/presentation/signup-form.tsx";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";

export const Route = createFileRoute("/_auth/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: resolveSafeRedirect(
      typeof search.redirectTo === "string" ? search.redirectTo : null,
    ),
  }),
  head: () => ({
    meta: [
      { title: "Crear cuenta | Futrob" },
      {
        name: "description",
        content: "Crea una cuenta en Futrob para poner tu competición bajo control.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirectTo } = Route.useSearch();
  return (
    <>
      <div className="mb-8">
        <AuthFormHeader
          description="Empieza gratis y organiza tu competición con más control, orden y transparencia."
          title="Crea tu cuenta"
        />
      </div>
      <SignupForm redirectTo={redirectTo} />
    </>
  );
}
