import type { ReactNode } from "react";
import { Logo } from "@futrob/ui";

export function AuthTunnelShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(0,700px)_minmax(0,1fr)]">
      <section className="auth-form-panel relative flex min-h-svh w-full items-center justify-center bg-[var(--neutral-0)] text-[var(--neutral-950)] [--background:var(--neutral-0)] [--border:var(--neutral-300)] [--border-subtle:var(--neutral-200)] [--destructive:var(--red-700)] [--foreground:var(--neutral-950)] [--input:var(--neutral-450)] [--muted-foreground:var(--neutral-600)] [--primary:var(--brand-700)] [--primary-foreground:var(--neutral-0)] [--ring:var(--brand-600)]">
        <header className="absolute start-5 top-[max(1.5rem,env(safe-area-inset-top))] sm:start-8">
          <Logo className="h-11 w-auto" title="Futrob" />
        </header>

        <div className="flex w-full max-w-md flex-col items-stretch gap-8 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-12">
          {children}
        </div>
      </section>

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
    </main>
  );
}
