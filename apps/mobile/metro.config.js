const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// Monorepo: hoisted workspace deps live at the repository root.
const workspaceRoot = path.resolve(projectRoot, "../..");

// Expo Router rewrites `require.context(process.env.EXPO_ROUTER_APP_ROOT)`
// inside babel; make the absolute app dir available to every transform.
process.env.EXPO_ROUTER_APP_ROOT = path.join(projectRoot, "app");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// `@futrob/*` packages use subpath exports (`.` → ./src/index.ts).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
