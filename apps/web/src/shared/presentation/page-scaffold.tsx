import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import type { MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    minWidth: 0,
  },
});

/** Page ids with a `pages.<id>.title` / `pages.<id>.subtitle` pair in the catalogs. */
export type ScaffoldPageId = {
  [K in MessageKey]: K extends `pages.${infer Id}.title` ? Id : never;
}[MessageKey];

/**
 * Page shell: title and subtitle from the catalogs, optional header actions and content.
 * Without content it is the navigable placeholder for a page that is not built yet.
 */
export function PageScaffold({
  page,
  actions,
  children,
}: Readonly<{ page: ScaffoldPageId; actions?: ReactNode; children?: ReactNode }>) {
  const { t } = useI18n();
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t(`pages.${page}.title`)}</PageHeaderTitle>
        <PageHeaderDescription>{t(`pages.${page}.subtitle`)}</PageHeaderDescription>
        {actions ? <PageHeaderActions>{actions}</PageHeaderActions> : null}
      </PageHeader>
      {children}
    </main>
  );
}
