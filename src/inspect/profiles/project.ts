import type { Profile, Resolver } from '../detail.js';
import type { Inspector } from '../probe.js';

const MANIFESTS = ['package.json', 'composer.json'];

interface Described {
	name?: string;
	version?: string;
}

const named: Resolver = (probe) => described(probe)?.name ?? null;

const versioned: Resolver = (probe) => described(probe)?.version ?? null;

export const project: Profile = {
	section: 'Project',
	when: named,
	details: { Name: named, Version: versioned },
};

function described(probe: Inspector): Described | null {
	for (const manifest of MANIFESTS) {
		const described = probe.json<Described>(manifest);

		if (described?.name) return described;
	}

	return null;
}
