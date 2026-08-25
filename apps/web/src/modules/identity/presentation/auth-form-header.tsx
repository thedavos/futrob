import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors, typography } from "@futrob/ui";

interface AuthFormHeaderProps {
  title: string;
  description?: string;
}

const styles = stylex.create({
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    textAlign: "center",
  },
  title: {
    fontSize: "1.875rem",
    lineHeight: "2.25rem",
  },
  description: {
    color: colors.mutedForeground,
  },
});

export function AuthFormHeader({ title, description }: Readonly<AuthFormHeaderProps>) {
  return (
    <header {...applyStyles(styles.header)}>
      <h1 {...applyStyles(typography.heading, styles.title)}>{title}</h1>
      {description == null ? null : (
        <p {...applyStyles(typography.subtitle, styles.description)}>{description}</p>
      )}
    </header>
  );
}
