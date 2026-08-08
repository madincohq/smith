import type { Inspector } from './probe.js';

const MANIFESTS = [
	{ file: 'package.json', requirements: ['dependencies', 'devDependencies'] },
	{ file: 'composer.json', requirements: ['require', 'require-dev'] },
];

export type Tone = 'good' | 'warn';

export interface Row {
	readonly value: string;
	readonly tone?: Tone;
}

export type Resolver = (probe: Inspector) => Row | string | number | null;

export type Condition = (probe: Inspector) => unknown;

export interface Profile {
	readonly section: string;
	readonly when: Condition;
	readonly details: Record<string, Resolver>;
}

export interface Entry extends Row {
	readonly label: string;
}

export interface Report {
	readonly section: string;
	readonly entries: Entry[];
}

type Manifest = Record<string, Record<string, string> | undefined>;

export const Detail = {
	version(name: string): Resolver {
		return (probe) => probe.installed(name);
	},

	dependency(pattern: string | RegExp): Resolver {
		return (probe) => declared(probe, pattern);
	},

	count(pattern: string): Resolver {
		return (probe) => probe.count(pattern) || null;
	},

	status(path: string, present: string, absent: string): Resolver {
		return (probe) =>
			probe.exists(path) ? { value: present, tone: 'good' } : { value: absent, tone: 'warn' };
	},

	literal(text: string): Resolver {
		return () => text;
	},
};

export function inspect(profiles: Profile[], probe: Inspector): Report[] {
	return profiles
		.filter((profile) => Boolean(profile.when(probe)))
		.map((profile) => ({ section: profile.section, entries: resolve(profile.details, probe) }))
		.filter((report) => report.entries.length > 0);
}

function resolve(details: Record<string, Resolver>, probe: Inspector): Entry[] {
	const entries: Entry[] = [];

	for (const [label, resolver] of Object.entries(details)) {
		const resolved = resolver(probe);

		if (resolved === null || resolved === '') continue;

		entries.push(
			typeof resolved === 'object' ? { label, ...resolved } : { label, value: String(resolved) }
		);
	}

	return entries;
}

function declared(probe: Inspector, pattern: string | RegExp): string | null {
	for (const { file, requirements } of MANIFESTS) {
		const manifest = probe.json<Manifest>(file);

		if (manifest === null) continue;

		for (const requirement of requirements) {
			const found = Object.keys(manifest[requirement] ?? {}).find((name) =>
				matches(pattern, name)
			);

			if (found !== undefined) return found;
		}
	}

	return null;
}

function matches(pattern: string | RegExp, name: string): boolean {
	return typeof pattern === 'string' ? name === pattern : pattern.test(name);
}
