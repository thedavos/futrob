import { useMemo, type ReactNode } from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { LoginForm } from "@/modules/identity/presentation/login-form.tsx";
import { SignupForm } from "@/modules/identity/presentation/signup-form.tsx";

const styles = stylex.create({
  shell: {
    width: "min(26rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: {
      default: "1.5rem",
      [media.sm]: "2rem",
    },
  },
  muted: { color: colors.mutedForeground },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
});

function AuthStoryShell({ children }: { children: ReactNode }) {
  return <div {...applyHost(undefined, undefined, styles.shell)}>{children}</div>;
}

function StubPage({ label }: { label: string }) {
  return (
    <AuthStoryShell>
      <p {...applyHost(undefined, undefined, typography.body, styles.muted)}>{label}</p>
    </AuthStoryShell>
  );
}

function createAuthStoryRouter(initialPath: "/login" | "/signup") {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => (
      <AuthStoryShell>
        <div {...applyHost(undefined, undefined, styles.stack)}>
          <AuthFormHeader
            description="Continúa gestionando tu competición."
            title="Inicia sesión"
          />
          <LoginForm />
        </div>
      </AuthStoryShell>
    ),
  });

  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/signup",
    component: () => (
      <AuthStoryShell>
        <div {...applyHost(undefined, undefined, styles.stack)}>
          <AuthFormHeader
            description="Empieza gratis y organiza tu competición con más control, orden y transparencia."
            title="Crea tu cuenta"
          />
          <SignupForm />
        </div>
      </AuthStoryShell>
    ),
  });

  const onboardingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/onboarding",
    component: () => <StubPage label="Onboarding (stub de Storybook)" />,
  });

  const orgsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orgs",
    component: () => <StubPage label="Organizaciones (stub de Storybook)" />,
  });

  const orgRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orgs/$orgId",
    component: () => <StubPage label="Organización (stub de Storybook)" />,
  });

  const routeTree = rootRoute.addChildren([
    loginRoute,
    signupRoute,
    onboardingRoute,
    orgsRoute,
    orgRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

export function AuthRouterDecorator({ initialPath }: { initialPath: "/login" | "/signup" }) {
  const router = useMemo(() => createAuthStoryRouter(initialPath), [initialPath]);
  return <RouterProvider router={router} />;
}
