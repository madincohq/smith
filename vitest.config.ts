import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const source = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^@\/(.*)$/, replacement: `${source}/$1` },
			{ find: /^@$/, replacement: `${source}/index.ts` },
		],
	},
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
