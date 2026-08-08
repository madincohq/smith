import type { Profile, Resolver } from '../detail.js';
import type { Inspector } from '../probe.js';

const LOCKFILES = [
	{ file: 'pnpm-lock.yaml', manager: 'pnpm' },
	{ file: 'package-lock.json', manager: 'npm' },
	{ file: 'yarn.lock', manager: 'yarn' },
	{ file: 'bun.lock', manager: 'bun' },
];

const packageManager: Resolver = (probe) => pinned(probe) ?? locked(probe);

export const runtime: Profile = {
	section: 'Runtime',
	when: () => true,
	details: { Node: () => process.version, 'Package manager': packageManager },
};

function pinned(probe: Inspector): string | null {
	const declared = probe.json<{ packageManager?: string }>('package.json')?.packageManager;

	return declared ? declared.replace('@', ' ') : null;
}

function locked(probe: Inspector): string | null {
	return LOCKFILES.find(({ file }) => probe.exists(file))?.manager ?? null;
}
