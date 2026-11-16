import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { VerifyEmailResult } from "@/modules/identity/presentation/email-verification.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

/** The auth worker lands here after a link; `error` names a used, expired or invalid one. */
const verifySearchSchema = z.object({
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/verify-email")({
  validateSearch: (search) => verifySearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Confirmar correo | Futrob" }, { name: "robots", content: "noindex" }],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { error } = Route.useSearch();
  const { t } = useI18n();
  return (
    <>
      <AuthFormHeader title={t("emailVerification.notice.title")} />
      <VerifyEmailResult error={error} />
    </>
  );
}
