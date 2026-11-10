import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { LandingFooter } from "@/shared/presentation/landing/landing-footer.tsx";
import { LandingHeader } from "@/shared/presentation/landing/landing-header.tsx";
import { LegalDocumentPage } from "./legal-document-page.tsx";
import type { LegalDocumentId } from "./legal-hrefs.ts";

const styles = stylex.create({
  main: {
    minHeight: "100vh",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
});

export function LegalPublicShell({ documentId }: { readonly documentId: LegalDocumentId }) {
  return (
    <main {...applyStyles(styles.main)}>
      <LandingHeader />
      <LegalDocumentPage documentId={documentId} />
      <LandingFooter />
    </main>
  );
}
