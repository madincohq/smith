#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { binary } from '../dist/cli/resolve.js';

const self = realpathSync(fileURLToPath(import.meta.url));
const nearest = binary(process.cwd());

if (nearest !== null && nearest !== self) {
	await import(pathToFileURL(nearest).href);
} else {
	const { run } = await import('../dist/cli/run.js');

	process.exit(await run(process.argv.slice(2), process.cwd()));
}
