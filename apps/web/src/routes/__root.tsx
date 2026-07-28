import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import appStyles from "@/styles.css?url";

const description =
  "Organiza ligas y copas de EA SPORTS FC Clubs con datos de partidos, resultados oficiales, tablas y brackets en un solo lugar.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Futrob — Competiciones FC Clubs" },
      { name: "description", content: description },
      { name: "application-name", content: "Futrob" },
      { name: "color-scheme", content: "light dark" },
      {
        name: "theme-color",
        content: "#f7faf8",
        media: "(prefers-color-scheme: light)",
      },
      { name: "theme-color", content: "#0b120e", media: "(prefers-color-scheme: dark)" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_ES" },
      { property: "og:site_name", content: "Futrob" },
      { property: "og:title", content: "Futrob — Competiciones FC Clubs" },
      { property: "og:description", content: description },
      { property: "og:image", content: "/og/futrob-default.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Futrob, operación confiable para competiciones FC Clubs",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Futrob — Competiciones FC Clubs" },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: "/og/futrob-default.png" },
      {
        name: "twitter:image:alt",
        content: "Futrob, operación confiable para competiciones FC Clubs",
      },
    ],
    links: [
      { rel: "stylesheet", href: appStyles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#22c55e" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
