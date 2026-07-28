import { createFileRoute } from "@tanstack/react-router";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { SignupForm } from "@/modules/identity/presentation/signup-form.tsx";

export const Route = createFileRoute("/_auth/signup")({
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
  return (
    <>
      <AuthFormHeader
        description="Empieza gratis y organiza tu competición con más control, orden y transparencia."
        title="Crea tu cuenta"
      />
      <SignupForm />
    </>
  );
}
