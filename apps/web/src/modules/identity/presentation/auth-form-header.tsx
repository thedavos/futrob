import { Logo } from "@futrob/ui";

interface AuthFormHeaderProps {
  title: string;
  description?: string;
}

export function AuthFormHeader({ title, description }: Readonly<AuthFormHeaderProps>) {
  return (
    <header className="mb-9">
      <div className="mb-10 hidden items-center gap-3 lg:flex">
        <Logo className="h-9 w-auto" />
        <span className="typo-heading tracking-wide">Futrob</span>
      </div>
      <h1 className="typo-heading text-3xl">{title}</h1>
      {description == null ? null : (
        <p className="typo-body mt-3 text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
