import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			'jsx-a11y': jsxA11y,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			...jsxA11y.configs.recommended.rules,
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

			// Disable React Compiler-specific rules (not using React Compiler)
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/preserve-manual-memoization': 'off',
			'react-hooks/refs': 'off',

			// a11y: autoFocus is intentional in bottom sheets/modals (ARIA best practice)
			'jsx-a11y/no-autofocus': 'off',
			// a11y: warn-only for pervasive patterns — fix incrementally
			'jsx-a11y/click-events-have-key-events': 'warn',
			'jsx-a11y/no-static-element-interactions': 'warn',
			'jsx-a11y/label-has-associated-control': 'warn',
		},
	},
);
