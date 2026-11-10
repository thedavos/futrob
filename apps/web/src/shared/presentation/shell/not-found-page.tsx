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
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  page: {
    display: "flex",
    minHeight: "100svh",
    flexDirection: "column",
    backgroundColor: colors.background,
  },
  logo: {
    height: "2.5rem",
    width: "auto",
  },
});

export type NotFoundAudience = "visitor" | "member";

const notFoundExits = {
  visitor: { to: "/", actionKey: "notFound.visitor.action" },
  member: { to: "/player", actionKey: "notFound.member.action" },
} as const satisfies Record<
  NotFoundAudience,
  {
    readonly to: "/" | "/player";
    readonly actionKey: "notFound.visitor.action" | "notFound.member.action";
  }
>;

export function notFoundAudience(input: { readonly user: unknown }): NotFoundAudience {
  return input.user == null ? "visitor" : "member";
}

function notFoundExit(audience: NotFoundAudience) {
  switch (audience) {
    case "visitor":
      return notFoundExits.visitor;
    case "member":
      return notFoundExits.member;
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
    <main {...applyStyles(styles.page)}>
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
  const user = session.isPending ? undefined : session.data?.user;
  return <NotFoundPage audience={notFoundAudience({ user })} />;
}
