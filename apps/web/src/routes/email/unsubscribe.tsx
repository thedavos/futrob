import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Logo, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { EmailUnsubscribePage } from "@/modules/notifications/presentation/email-unsubscribe-page.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  main: {
    display: "grid",
    marginInline: "auto",
    width: "100%",
    maxWidth: "36rem",
    gap: "1.5rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "2.5rem",
  },
  brand: {
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  logo: {
    height: "2rem",
    width: "auto",
  },
  wordmark: {
    fontWeight: 600,
    letterSpacing: "0.025em",
  },
});

const unsubscribeSearchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
});

/** Anonymous: the link in a non-critical email (ADR-0028). */
export const Route = createFileRoute("/email/unsubscribe")({
  validateSearch: unsubscribeSearchSchema,
  head: () => ({
    meta: [{ title: "Avisos por email | Futrob" }, { name: "robots", content: "noindex" }],
  }),
  component: EmailUnsubscribeRoute,
});

function EmailUnsubscribeRoute() {
  const { token } = Route.useSearch();
  const { t } = useI18n();
  const logo = applyStyles(styles.logo);
  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.brand)}>
        <Logo className={logo.className} style={logo.style} />
        <span {...applyStyles(styles.wordmark)}>Futrob</span>
      </header>
      <PageHeader>
        <PageHeaderTitle>{t("emailUnsubscribe.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("emailUnsubscribe.description")}</PageHeaderDescription>
      </PageHeader>
      <EmailUnsubscribePage token={token ?? null} />
    </main>
  );
}
