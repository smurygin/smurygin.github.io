import eslint from '@eslint/js';
import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import projectRules from './tools/project-eslint/project-rules.mjs';

const typeScriptFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const javaScriptFiles = ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'];

export default tseslint.config(
  {
    ignores: [
      '**/.angular/**',
      '**/.pnpm-store/**',
      '**/.playwright/**',
      '**/.impeccable/live/**',
      '**/blob-report/**',
      '**/playwright/.cache/**',
      '**/tmp/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/out-tsc/**',
      '**/.snapshot-build/**',
      '**/playwright-report/**',
      '**/public/art/**',
      '**/test-results/**',
    ],
  },
  ...nx.configs['flat/base'],
  {
    files: javaScriptFiles,
    extends: [eslint.configs.recommended, ...nx.configs['flat/javascript']],
  },
  {
    files: typeScriptFiles,
    extends: [
      eslint.configs.recommended,
      ...nx.configs['flat/typescript'],
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      project: projectRules,
    },
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/sort-keys-in-type-decorator': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression',
          message:
            'Type assertions, including as const, are forbidden. Use annotations, satisfies or runtime narrowing.',
        },
        {
          selector: 'TSTypeAssertion',
          message:
            'Type assertions are forbidden. Use annotations, satisfies or runtime narrowing.',
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: false },
      ],
      '@typescript-eslint/typedef': [
        'error',
        {
          arrayDestructuring: true,
          arrowParameter: true,
          memberVariableDeclaration: true,
          objectDestructuring: true,
          parameter: true,
          propertyDeclaration: true,
          variableDeclaration: true,
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'off',
      curly: ['error', 'all'],
      'no-param-reassign': ['error', { props: true }],
      'no-plusplus': 'error',
      'project/no-mutation': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'project/one-export-per-file': 'error',
      'project/readonly-interface-properties': 'error',
    },
  },
  {
    files: ['src/app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message:
                'Import HttpClient only from app/services/requests/*.service.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/services/requests/**/*.service.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/attributes-order': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/prefer-at-else': 'error',
      '@angular-eslint/template/prefer-at-empty': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-static-string-properties': 'error',
    },
  },
  prettier,
);
