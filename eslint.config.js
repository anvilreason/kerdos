import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'worker/node_modules', 'src-tauri/target']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow intentionally-unused args / vars prefixed with `_` (common
      // convention for callback shapes where a later param is required).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
      // This rule (React 19 compiler-era advisory) flags a lot of legitimate
      // patterns — syncing a controlled `open` prop to internal state, or
      // resetting an index when the query changes. It's a performance hint,
      // not a correctness error; downgrade to 'warn' so it's visible in dev
      // without blocking CI. Re-evaluate once React Compiler is enabled.
      'react-hooks/set-state-in-effect': 'warn',
      // Immutability analyzer is similarly overzealous with helper closures
      // like `resetForm` being referenced by effects — keeping as warn.
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // shadcn/ui primitives legitimately co-export variants + components.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
