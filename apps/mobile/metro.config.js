// Metro config tuned for an npm-workspaces monorepo.
// We add the repo root to watchFolders so changes to @wh/shared are picked up,
// and add the root node_modules to the resolver search paths. Hierarchical
// lookup is left enabled (Expo's default) so package resolution still works.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo in addition to Expo's defaults.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

// Resolve modules from the app first, then the hoisted workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
