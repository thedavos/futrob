"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  Logo,
  PageHeaderTitle,
} from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  logo: {
    height: "2.5rem",
    width: "auto",
  },
});

export type NotFoundAudience = "visitor" | "member";

export function notFoundAudience(signedIn: boolean): NotFoundAudience {
  return signedIn ? "member" : "visitor";
}

function notFoundExit(audience: NotFoundAudience) {
  switch (audience) {
    case "visitor":
      return { to: "/" as const, actionKey: "notFound.visitor.action" as const };
    case "member":
      return { to: "/player" as const, actionKey: "notFound.member.action" as const };
    default: {
      const _exhaustive: never = audience;
      return _exhaustive;
    }
  }
}

export function NotFoundPage({ audience }: { readonly audience: NotFoundAudience }) {
  const { t } = useI18n();
  const exit = notFoundExit(audience);
  return (
    <main>
      <EmptyState fill>
        <EmptyStateIcon>
          <Logo {...applyStyles(styles.logo)} />
        </EmptyStateIcon>
        <EmptyStateCopy>
          <PageHeaderTitle>{t("notFound.title")}</PageHeaderTitle>
          <EmptyStateDescription>{t("notFound.description")}</EmptyStateDescription>
        </EmptyStateCopy>
        <EmptyStateActions>
          <Button render={<Link to={exit.to} />} role="link">
            {t(exit.actionKey)}
          </Button>
        </EmptyStateActions>
      </EmptyState>
    </main>
  );
}

export function RootNotFoundPage() {
  const session = authClient.useSession();
  return <NotFoundPage audience={notFoundAudience(session.data?.user != null)} />;
}
