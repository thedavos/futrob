import { ArrowDownRight } from "@phosphor-icons/react";
import { Button, ButtonIcon, Logo } from "@futrob/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
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
          <span className="typo-heading tracking-wide max-sm:hidden">Futrob</span>
        </div>
        <nav aria-label="Acceso" className="flex items-center gap-1">
          <Button render={<Link to="/login" />} variant="ghost">
            Iniciar sesión
          </Button>
          <Button render={<Link to="/signup" />}>Crear cuenta</Button>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-16 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <div className="max-w-xl">
          <p className="typo-label mb-5 text-primary">Del partido EA al resultado oficial</p>
          <h1 className="typo-display">
            Tu competición,
            <br />
            bajo control.
          </h1>
          <p className="typo-body mt-6 max-w-[60ch] text-muted-foreground sm:text-lg">
            Opera ligas y copas de FC Clubs con datos reales, resultados auditables y una
            experiencia clara para organizadores, capitanes y espectadores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<a href="#club-search" />}>
              Buscar clubs EA
              <ButtonIcon>
                <ArrowDownRight />
              </ButtonIcon>
            </Button>
            <Button render={<a href="#principios" />} variant="secondary">
              Conocer el sistema
            </Button>
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
