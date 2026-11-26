// Flat ESLint config (ESLint 9+). Extends Expo's shareable config, which
// already wires up TypeScript, React, React Hooks and import rules for
// an Expo/React Native project.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
]);
