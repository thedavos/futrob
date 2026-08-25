import type { CSSProperties, ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles, Logo, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
const styles = stylex.create({
  main: {
    display: "grid",
    minHeight: "100svh",
    backgroundColor: colors.background,
    color: colors.foreground,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 700px) minmax(0, 1fr)",
    },
  },
  formPanel: {
    position: "relative",
    display: "flex",
    minHeight: "100svh",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--neutral-0)",
    color: "var(--neutral-950)",
  },
  brand: {
    position: "absolute",
    insetInlineStart: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    top: "max(1.5rem, env(safe-area-inset-top))",
  },
  logo: {
    height: "2.75rem",
    width: "auto",
  },
  form: {
    display: "flex",
    width: "100%",
    maxWidth: "28rem",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "2rem",
    paddingInline: {
      default: "1rem",
      [media.sm]: "3rem",
    },
    paddingTop: "max(2.5rem, env(safe-area-inset-top))",
    paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
  },
  visual: {
    position: "relative",
    display: {
      default: "none",
      [media.lg]: "flex",
    },
    overflow: "hidden",
    minHeight: {
      default: null,
      [media.lg]: "100svh",
    },
    flexDirection: {
      default: null,
      [media.lg]: "column",
    },
    justifyContent: {
      default: null,
      [media.lg]: "flex-end",
    },
    padding: {
      default: null,
      [media.lg]: "3.5rem",
      [media.xl]: "5rem",
    },
  },
  image: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 30%",
  },
  wash: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage:
      "linear-gradient(to top, rgb(0 0 0 / 0.8), rgb(0 0 0 / 0.35), rgb(0 0 0 / 0.15))",
  },
  copy: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    maxWidth: "36rem",
    flexDirection: "column",
    gap: "1.5rem",
    color: "white",
  },
  highlight: {
    color: "var(--brand-300)",
  },
  support: {
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
    color: "rgb(255 255 255 / 0.8)",
  },
});

export function AuthTunnelShell({ children }: Readonly<{ children: ReactNode }>) {
  const logo = applyStyles(styles.logo);
  return (
    <main {...applyStyles(styles.main)}>
      <section
        {...applyProps(
          undefined,
          // SAFETY: custom properties are valid host styles; CSSProperties
          // does not list arbitrary `--*` names.
          {
            "--background": "var(--neutral-0)",
            "--border": "var(--neutral-300)",
            "--border-subtle": "var(--neutral-200)",
            "--destructive": "var(--red-700)",
            "--foreground": "var(--neutral-950)",
            "--input": "var(--neutral-450)",
            "--muted-foreground": "var(--neutral-600)",
            "--primary": "var(--brand-700)",
            "--primary-foreground": "var(--neutral-0)",
            "--ring": "var(--brand-600)",
          } as CSSProperties,
          styles.formPanel,
        )}
      >
        <header {...applyStyles(styles.brand)}>
          <Logo className={logo.className} style={logo.style} title="Futrob" />
        </header>

        <div {...applyStyles(styles.form)}>{children}</div>
      </section>

      <section {...applyStyles(styles.visual)}>
        <img alt="" aria-hidden="true" src="/auth/tunnel-hero.jpg" {...applyStyles(styles.image)} />
        <div aria-hidden="true" {...applyStyles(styles.wash)} />

        <div {...applyStyles(styles.copy)}>
          <p {...applyStyles(typography.display)}>
            Haz que tu torneo se juegue <span {...applyStyles(styles.highlight)}>en serio</span>.
          </p>
          <p {...applyStyles(typography.body, styles.support)}>
            Organiza partidos, valida resultados y mantén tu tabla al día con una experiencia
            pensada para competiciones de fútbol y gaming.
          </p>
        </div>
      </section>
    </main>
  );
}
