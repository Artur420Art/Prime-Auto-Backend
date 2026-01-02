import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**'],
    },

    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            // Prettier integration
            'prettier/prettier': 'error',

            // NestJS / TS best practices
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-inferrable-types': 'off',

            // Clean code
            'no-console': 'off',
        },
    }
)
