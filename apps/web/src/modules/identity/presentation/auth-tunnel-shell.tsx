import type { ReactNode } from "react";
import { Logo } from "@futrob/ui";

export function AuthTunnelShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr] bg-background text-foreground lg:grid-cols-[minmax(0,1.2fr)_minmax(25rem,1fr)] lg:grid-rows-1">
      <section className="relative hidden overflow-hidden bg-background lg:flex lg:min-h-svh lg:flex-col lg:justify-end lg:p-14 xl:p-20">
        <div
          aria-hidden="true"
          className="absolute inset-[7%] overflow-hidden border border-border/60"
        >
          <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
          <div className="absolute top-1/2 left-1/2 size-40 -translate-1/2 rounded-full border border-border/60" />
          <div className="absolute top-1/2 -left-px h-52 w-28 -translate-y-1/2 border border-border/60 bg-background/40" />
          <div className="absolute top-1/2 -right-px h-52 w-28 -translate-y-1/2 border border-border/60 bg-background/40" />
          <Logo
            className="absolute top-1/2 left-1/2 h-[72%] w-auto -translate-1/2 text-primary opacity-[0.07]"
            monochrome
          />
        </div>

        <div className="relative z-10 flex max-w-2xl flex-col gap-8">
          <p className="type-hero">Tu competición, bajo control.</p>
          <p className="type-body text-lg text-muted-foreground">
            Del partido EA al resultado oficial.
          </p>
        </div>
      </section>

      <header className="flex items-center justify-between gap-5 border-b border-border-subtle bg-background px-5 py-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-auto" />
          <span className="font-semibold tracking-wide">Futrob</span>
        </div>
        <p className="max-w-48 text-right text-xs leading-5 text-muted-foreground">
          Del partido EA al resultado oficial.
        </p>
      </header>

      <section className="auth-form-panel flex min-h-0 items-center justify-center bg-[var(--neutral-0)] px-5 py-10 text-[var(--neutral-950)] sm:px-10 lg:px-12 lg:py-16 [--background:var(--neutral-0)] [--border:var(--neutral-300)] [--border-subtle:var(--neutral-200)] [--destructive:var(--red-700)] [--foreground:var(--neutral-950)] [--input:var(--neutral-450)] [--muted-foreground:var(--neutral-600)] [--primary:var(--brand-700)] [--primary-foreground:var(--neutral-0)] [--ring:var(--brand-600)]">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
