import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin } from "vite-plus";
import { globSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { futrobStylex } from "../tools/stylex/vite-plugin.ts";

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, "..");
const webSrc = resolve(repoRoot, "apps/web/src");

function getAbsolutePath(packageName: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)));
}

type BrowserClientMock = {
  readonly file: string;
  readonly skip: string;
  readonly names: readonly string[];
};

function webPresentation(file: string): string {
  return resolve(webSrc, file);
}

const browserClientMocks: readonly BrowserClientMock[] = [
  {
    file: webPresentation("modules/statistics/presentation/player-matches-story-client.ts"),
    skip: "player-matches-story-client",
    names: ["statistics-browser-client"],
  },
  {
    file: webPresentation("modules/teams/presentation/player-story-client.ts"),
    skip: "player-story-client",
    names: ["teams-browser-client"],
  },
  {
    file: webPresentation("modules/game-data/presentation/game-data-story-client.ts"),
    skip: "game-data-story-client",
    names: ["game-data-browser-client"],
  },
  {
    file: webPresentation("modules/organizations/presentation/organizations-story-client.ts"),
    skip: "organizations-story-client",
    names: ["organizations-browser-client"],
  },
  {
    file: webPresentation("modules/competitions/presentation/competitions-story-client.ts"),
    skip: "competitions-story-client",
    names: ["competitions-browser-client"],
  },
  {
    file: webPresentation("modules/competitions/presentation/entry-invitations-story-client.ts"),
    skip: "entry-invitations-story-client",
    names: ["entry-invitations-browser-client"],
  },
];

function mockFileFor(name: string): string {
  const mock = browserClientMocks.find((item) => item.names.includes(name));
  if (!mock) {
    throw new Error(`Missing Storybook browser-client mock for ${name}`);
  }
  return mock.file;
}

function matchesBrowserClient(id: string, mock: BrowserClientMock): boolean {
  return mock.names.some(
    (name) =>
      id === `./${name}.ts` ||
      id === `./${name}` ||
      id.endsWith(`/${name}.ts`) ||
      id.endsWith(`/${name}`),
  );
}

const storyGlobs = [
  "../packages/ui/src/**/*.stories.@(ts|tsx)",
  "../apps/web/src/**/*.stories.@(ts|tsx)",
];

/**
 * Vite skips `server.warmup` in middleware mode, which is how Storybook runs it.
 * Once the preview iframe is first requested (deps optimizer already running),
 * transform every story graph in the background so opening a story for the
 * first time does not wait on StyleX/Babel transforms.
 */
function warmStoriesAfterFirstPreview(): Plugin {
  return {
    name: "storybook-warm-stories",
    apply: "serve",
    configureServer(server) {
      let warmed = false;
      server.middlewares.use((req, _res, next) => {
        if (!warmed && req.url?.startsWith("/iframe.html")) {
          warmed = true;
          const files = storyGlobs.flatMap((pattern) =>
            globSync(pattern, { cwd: configDir }).map((file) => resolve(configDir, file)),
          );
          for (const file of files) {
            void server.warmupRequest(`/${relative(server.config.root, file)}`);
          }
        }
        next();
      });
    },
  };
}

const config: StorybookConfig = {
  stories: storyGlobs,
  addons: [
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest"),
  ],
  core: {
    disableWhatsNewNotifications: true,
  },
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
  staticDirs: [
    { from: "../apps/web/public/favicon.svg", to: "/favicon.svg" },
    { from: "../apps/web/public", to: "/brand" },
    {
      from: resolve(getAbsolutePath("@fontsource-variable/manrope"), "files"),
      to: "/fonts/manrope",
    },
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  async viteFinal(viteConfig) {
    const statisticsStoryClient = mockFileFor("statistics-browser-client");
    const teamsStoryClient = mockFileFor("teams-browser-client");
    const gameDataStoryClient = mockFileFor("game-data-browser-client");
    const organizationsStoryClient = mockFileFor("organizations-browser-client");
    const competitionsStoryClient = mockFileFor("competitions-browser-client");
    viteConfig.plugins = [
      {
        name: "storybook-mock-browser-clients",
        enforce: "pre",
        resolveId(source: string) {
          const id = source.replaceAll("\\", "/").split("?")[0] ?? source;
          for (const mock of browserClientMocks) {
            if (id.includes(mock.skip)) continue;
            if (matchesBrowserClient(id, mock)) return mock.file;
          }
          return null;
        },
      },
      futrobStylex(),
      warmStoriesAfterFirstPreview(),
      ...(viteConfig.plugins ?? []),
    ];
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: [
        // Match with or without `.ts` — Vite may strip the extension before alias lookup.
        {
          find: /^@\/modules\/identity\/(?:adapters\/auth\/)?auth-client(?:\.ts)?$/,
          replacement: resolve(configDir, "mocks/auth-client.ts"),
        },
        {
          find: /^@\/modules\/organizations\/presentation\/organizations-browser-client(?:\.ts)?$/,
          replacement: organizationsStoryClient,
        },
        {
          find: /^@\/modules\/teams\/presentation\/teams-browser-client(?:\.ts)?$/,
          replacement: teamsStoryClient,
        },
        {
          find: /^@\/modules\/game-data\/presentation\/game-data-browser-client(?:\.ts)?$/,
          replacement: gameDataStoryClient,
        },
        {
          find: /^@\/modules\/statistics\/presentation\/statistics-browser-client(?:\.ts)?$/,
          replacement: statisticsStoryClient,
        },
        {
          find: /^@\/modules\/competitions\/presentation\/competitions-browser-client(?:\.ts)?$/,
          replacement: competitionsStoryClient,
        },
        {
          find: "@",
          replacement: webSrc,
        },
        {
          find: /^#styles\/(.*)$/,
          replacement: resolve(repoRoot, "packages/ui/src/styles/$1"),
        },
        ...(Array.isArray(viteConfig.resolve?.alias)
          ? viteConfig.resolve.alias
          : Object.entries(viteConfig.resolve?.alias ?? {}).map(([find, replacement]) => ({
              find,
              replacement: String(replacement),
            }))),
      ],
      dedupe: [...new Set([...(viteConfig.resolve?.dedupe ?? []), "react", "react-dom"])],
    };
    return viteConfig;
  },
};

export default config;
