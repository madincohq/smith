import { join } from 'node:path';
import { createJiti } from 'jiti';
import type { Importer } from '../kernel.js';

const ANCHOR = '_index.js';

export function importer(directory: string): Importer {
	const jiti = createJiti(join(directory, ANCHOR), { tsconfigPaths: true });

	return (path) => jiti.import<Record<string, unknown>>(path);
}
