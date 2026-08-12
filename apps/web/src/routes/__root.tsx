import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute, useRouter } from "@tanstack/react-router";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider, useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { getUiLocale, setUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { DEFAULT_LOCALE, localeOpenGraphCode } from "@/shared/presentation/i18n/locale.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { AppProviders } from "@/shared/presentation/query/app-providers.tsx";
import appStyles from "@/styles.css?url";

export const Route = createRootRoute({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => {
    const locale = loaderData ?? DEFAULT_LOCALE;
    const t = createTranslator(locale);
    return {
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        { title: t("app.title") },
        { name: "description", content: t("app.description") },
        { name: "application-name", content: "Futrob" },
        { name: "color-scheme", content: "light" },
        { name: "theme-color", content: "#f7faf8" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: localeOpenGraphCode(locale) },
        { property: "og:site_name", content: "Futrob" },
        { property: "og:title", content: t("app.title") },
        { property: "og:description", content: t("app.description") },
        { property: "og:image", content: "/og/futrob-default.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: t("app.imageAlt"),
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("app.title") },
        { name: "twitter:description", content: t("app.description") },
        { name: "twitter:image", content: "/og/futrob-default.png" },
        {
          name: "twitter:image:alt",
          content: t("app.imageAlt"),
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
    };
  },
  component: RootComponent,
});

function RootComponent() {
  const initialLocale = Route.useLoaderData();
  const router = useRouter();
  return (
    <I18nProvider
      initialLocale={initialLocale}
      persistLocale={async (locale) => {
        await persistUiLocale(locale);
        await router.invalidate();
      }}
    >
      <RootDocument>
        <AppProviders>
          <Outlet />
        </AppProviders>
      </RootDocument>
    </I18nProvider>
  );
}

async function persistUiLocale(locale: Locale): Promise<void> {
  await setUiLocale({ data: { locale } });
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { locale } = useI18n();
  return (
    <html data-theme="light" lang={locale}>
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
