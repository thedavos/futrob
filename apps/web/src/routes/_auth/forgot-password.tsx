import { createFileRoute } from "@tanstack/react-router";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { ForgotPasswordForm } from "@/modules/identity/presentation/password-reset-forms.tsx";

export const Route = createFileRoute("/_auth/forgot-password")({
  head: () => ({
    meta: [{ title: "Recuperar contraseña | Futrob" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <>
      <AuthFormHeader
        description="Te enviaremos un enlace para elegir una contraseña nueva."
        title="Recupera tu contraseña"
      />
      <ForgotPasswordForm />
    </>
  );
}
