import { Logo } from "@futrob/ui";
import { createFileRoute } from "@tanstack/react-router";
import { ClubSearchPanel } from "@/modules/game-data/presentation/club-search-panel.tsx";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <span className="type-title tracking-wide">Futrob</span>
        </div>
        <span className="type-label text-muted-foreground">Competition OS</span>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-16 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <div className="max-w-xl">
          <p className="type-label mb-5 text-primary">Del partido EA al resultado oficial</p>
          <h1 className="type-hero">
            Tu competición,
            <br />
            bajo control.
          </h1>
          <p className="type-body mt-6 max-w-[60ch] text-muted-foreground sm:text-lg">
            Opera ligas y copas de FC Clubs con datos reales, resultados auditables y una
            experiencia clara para organizadores, capitanes y espectadores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground transition-[background-color,transform] duration-180 hover:bg-primary-hover active:scale-[0.96]"
              href="#club-search"
            >
              Buscar clubs EA
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary px-5 font-semibold text-secondary-foreground transition-[background-color,transform] duration-180 hover:bg-secondary-hover active:scale-[0.96]"
              href="#principios"
            >
              Conocer el sistema
            </a>
          </div>
        </div>

        <div id="club-search">
          <ClubSearchPanel />
        </div>
      </section>

      <footer
        className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-8 text-muted-foreground sm:px-8"
        id="principios"
      >
        <Logo className="h-5 w-auto" monochrome />
        <span className="text-sm">Preciso para operar. Claro para competir.</span>
      </footer>
    </main>
  );
}
