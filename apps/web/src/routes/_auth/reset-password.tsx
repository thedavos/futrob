import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { ResetPasswordForm } from "@/modules/identity/presentation/password-reset-forms.tsx";

/** The auth worker lands here with `token`, or with `error=INVALID_TOKEN` for a dead link. */
const resetSearchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/reset-password")({
  validateSearch: (search) => resetSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Nueva contraseña | Futrob" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error } = Route.useSearch();
  return (
    <>
      <AuthFormHeader title="Elige una contraseña nueva" />
      <ResetPasswordForm key={token} invalid={error !== undefined} token={token} />
    </>
  );
}
