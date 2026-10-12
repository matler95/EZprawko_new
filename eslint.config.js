// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/hooks/use-color-scheme.web.ts"],
    rules: {
      // This Expo starter hook intentionally marks the client as hydrated after mount.
      "react-hooks/set-state-in-effect": "off",
    },
  }
]);
