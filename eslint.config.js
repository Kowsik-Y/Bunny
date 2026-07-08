// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      '**/dist/**',
      '**/android/**',
      '**/ios/**',
      '**/.expo/**',
      '**/assets/ui-sample/**'
    ],
  },
  expoConfig,
  {
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/static-components': 'warn',
      'react/display-name': 'off'
    }
  },
]);
