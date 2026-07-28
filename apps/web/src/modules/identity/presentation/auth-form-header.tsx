import { Logo } from "@futrob/ui";

interface AuthFormHeaderProps {
  title: string;
  description?: string;
}

export function AuthFormHeader({ title, description }: Readonly<AuthFormHeaderProps>) {
  return (
    <header>
      <div className="mb-8 hidden lg:block">
        <Logo className="h-14 w-auto" title="Futrob" />
      </div>
      <h1 className="typo-heading text-3xl">{title}</h1>
      {description == null ? null : (
        <p className="typo-subtitle mt-3 text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
