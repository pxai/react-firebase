import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // The game/ folder is a separate project with its own eslint config
  // (4-space indent, double quotes); public/game is its build output.
  {
    ignores: [
      'dist',
      'build',
      'public/game',
      'game',
      'node_modules',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Jest tests, mocks and setup run in node + jest, not just the browser.
  {
    files: [
      '**/__tests__/**/*.{js,jsx}',
      '**/__mocks__/**/*.{js,jsx}',
      '**/*.test.{js,jsx}',
      'jest.setup.js',
      'jest.config.js',
      'babel.config.cjs',
    ],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
  },
]
