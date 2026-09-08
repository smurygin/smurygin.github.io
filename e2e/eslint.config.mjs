import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '../dist/**',
      '../node_modules/**',
      '../playwright-report/**',
      '../test-results/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.mts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      playwright.configs['flat/recommended'],
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },
  prettier,
);
