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
import { applyProps, typography } from "@futrob/ui";
import { z } from "zod";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { AuthFormHeader } from "@/modules/identity/presentation/auth-form-header.tsx";
import { LoginForm } from "@/modules/identity/presentation/login-form.tsx";
import {
  ForgotPasswordForm,
  ResetPasswordForm,
} from "@/modules/identity/presentation/password-reset-forms.tsx";
import { SignupForm } from "@/modules/identity/presentation/signup-form.tsx";
import { VerifyEmailResult } from "@/modules/identity/presentation/email-verification.tsx";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";

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
  return <div {...applyProps(undefined, undefined, styles.shell)}>{children}</div>;
}

function StubPage({ label }: { label: string }) {
  return (
    <AuthStoryShell>
      <p {...applyProps(undefined, undefined, typography.body, styles.muted)}>{label}</p>
    </AuthStoryShell>
  );
}

const resetSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export type AuthStoryPath =
  | "/login"
  | "/signup"
  | "/forgot-password"
  | `/reset-password${string}`
  | `/verify-email${string}`;

function createAuthStoryRouter(initialPath: AuthStoryPath) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => (
      <AuthStoryShell>
        <div {...applyProps(undefined, undefined, styles.stack)}>
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
        <div {...applyProps(undefined, undefined, styles.stack)}>
          <AuthFormHeader
            description="Empieza gratis y organiza tu competición con más control, orden y transparencia."
            title="Crea tu cuenta"
          />
          <SignupForm />
        </div>
      </AuthStoryShell>
    ),
  });

  const forgotPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/forgot-password",
    component: () => (
      <AuthStoryShell>
        <div {...applyProps(undefined, undefined, styles.stack)}>
          <AuthFormHeader
            description="Te enviaremos un enlace para elegir una contraseña nueva."
            title="Recupera tu contraseña"
          />
          <ForgotPasswordForm />
        </div>
      </AuthStoryShell>
    ),
  });

  const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/reset-password",
    validateSearch: (search) => resetSearchSchema.parse(search),
    component: function ResetPasswordStory() {
      const { token, error } = resetPasswordRoute.useSearch();
      return (
        <AuthStoryShell>
          <div {...applyProps(undefined, undefined, styles.stack)}>
            <AuthFormHeader title="Elige una contraseña nueva" />
            <ResetPasswordForm invalid={error !== undefined} token={token} />
          </div>
        </AuthStoryShell>
      );
    },
  });

  const verifyEmailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/verify-email",
    validateSearch: (search) => resetSearchSchema.pick({ error: true }).parse(search),
    component: function VerifyEmailStory() {
      const { error } = verifyEmailRoute.useSearch();
      return (
        <AuthStoryShell>
          <div {...applyProps(undefined, undefined, styles.stack)}>
            <AuthFormHeader title="Confirma tu correo" />
            <VerifyEmailResult error={error} />
          </div>
        </AuthStoryShell>
      );
    },
  });

  const playerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/player",
    component: () => <StubPage label="Mi espacio (stub de Storybook)" />,
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

  const termsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/terms",
    component: () => <StubPage label="Términos (stub de Storybook)" />,
  });

  const privacyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/privacy",
    component: () => <StubPage label="Privacidad (stub de Storybook)" />,
  });

  const routeTree = rootRoute.addChildren([
    loginRoute,
    signupRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    verifyEmailRoute,
    playerRoute,
    onboardingRoute,
    orgsRoute,
    orgRoute,
    termsRoute,
    privacyRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

export function AuthRouterDecorator({ initialPath }: { initialPath: AuthStoryPath }) {
  const router = useMemo(() => createAuthStoryRouter(initialPath), [initialPath]);
  return (
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
