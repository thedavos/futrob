import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { SignupForm } from "@/modules/identity/presentation/signup-form.tsx";
import { sanitizePostAuthRedirect } from "@/shared/presentation/auth/post-auth-redirect.ts";

const signupSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_auth/signup")({
  validateSearch: (search) =>
    signupSearchSchema.parse({
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
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
  const { redirect: rawRedirect } = Route.useSearch();
  const redirect = sanitizePostAuthRedirect(rawRedirect);

  return (
    <>
      <div className="mb-8">
        <AuthFormHeader
          description="Empieza gratis y organiza tu competición con más control, orden y transparencia."
          title="Crea tu cuenta"
        />
      </div>
      <SignupForm redirect={redirect} />
    </>
  );
}
