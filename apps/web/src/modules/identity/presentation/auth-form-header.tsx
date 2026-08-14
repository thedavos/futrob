interface AuthFormHeaderProps {
  title: string;
  description?: string;
}

export function AuthFormHeader({ title, description }: Readonly<AuthFormHeaderProps>) {
  return (
    <header className="flex flex-col gap-3 text-center">
      <h1 className="typo-heading text-balance text-3xl">{title}</h1>
      {description == null ? null : (
        <p className="typo-subtitle text-pretty text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
