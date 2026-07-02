// @ts-check
import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import eslintImport from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat['recommended-latest'],
    eslintConfigPrettier,
    globalIgnores([
        '**/node_modules',
        'dist/',
        'eslint.config.mjs',
        'prettier.config.mjs',
    ]),
    {
        rules: {
            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'prefer-arrow-callback': 'error',
            'func-style': ['error', 'expression', { allowArrowFunctions: true }],
        },
    },
    {
        plugins: {
            'unused-imports': unusedImports,
            import: eslintImport,
        },
        rules: {
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        ['internal', 'parent', 'sibling'],
                        ['object', 'type', 'index'],
                    ],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                    'newlines-between': 'always',
                },
            ],
        },
    },
)
