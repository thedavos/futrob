import type { ReactNode } from "react";
import { Logo } from "@futrob/ui";

export function AuthTunnelShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr] bg-background text-foreground lg:grid-cols-[minmax(0,1.2fr)_minmax(25rem,1fr)] lg:grid-rows-1">
      <section className="relative hidden overflow-hidden lg:flex lg:min-h-svh lg:flex-col lg:justify-end lg:p-14 xl:p-20">
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[center_30%]"
          src="/auth/tunnel-hero.jpg"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-black/15"
        />

        <div className="relative z-10 flex max-w-xl flex-col gap-6 text-white">
          <p className="typo-display text-balance">
            Haz que tu torneo se juegue <span className="text-brand-300">en serio</span>.
          </p>
          <p className="typo-body text-lg text-pretty text-white/80">
            Organiza partidos, valida resultados y mantén tu tabla al día con una experiencia
            pensada para competiciones de fútbol y gaming.
          </p>
        </div>
      </section>

      <header className="flex items-center justify-between gap-5 border-b border-border-subtle bg-background px-5 py-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-auto" />
          <span className="font-semibold tracking-wide">Futrob</span>
        </div>
        <p className="max-w-48 text-right text-xs leading-5 text-muted-foreground">
          Tu torneo, en serio.
        </p>
      </header>

      <section className="auth-form-panel flex min-h-0 items-center justify-center bg-[var(--neutral-0)] px-5 py-10 text-[var(--neutral-950)] sm:px-10 lg:px-12 lg:py-16 [--background:var(--neutral-0)] [--border:var(--neutral-300)] [--border-subtle:var(--neutral-200)] [--destructive:var(--red-700)] [--foreground:var(--neutral-950)] [--input:var(--neutral-450)] [--muted-foreground:var(--neutral-600)] [--primary:var(--brand-700)] [--primary-foreground:var(--neutral-0)] [--ring:var(--brand-600)]">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
