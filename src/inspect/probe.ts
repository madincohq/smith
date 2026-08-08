import { existsSync, globSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const PRUNED = new Set(['node_modules', 'vendor', '.git']);

const VENDOR = ['vendor/composer/installed.json', 'composer.lock'];

export type Registry = (probe: Inspector, name: string) => string | null;

export type Inspector = Pick<Probe, 'text' | 'json' | 'exists' | 'files' | 'count' | 'installed'>;

interface Release {
	version?: string;
}

interface Package extends Release {
	name?: string;
}

interface Index {
	packages?: Package[];
	'packages-dev'?: Package[];
}

export const npm: Registry = (probe, name) =>
	probe.json<Release>(join('node_modules', name, 'package.json'))?.version ?? null;

export const composer: Registry = (probe, name) => {
	for (const source of VENDOR) {
		const found = packages(probe, source).find((entry) => entry.name === name);

		if (found?.version) return found.version.replace(/^v(?=\d)/, '');
	}

	return null;
};

export const REGISTRIES: Registry[] = [npm, composer];

export class Probe {
	private readonly cache = new Map<string, unknown>();

	constructor(
		readonly root: string,
		private readonly registries: Registry[] = REGISTRIES
	) {}

	text(path: string): string | null {
		return this.memo(`text:${path}`, () => {
			try {
				return readFileSync(join(this.root, path), 'utf8');
			} catch {
				return null;
			}
		});
	}

	json<T>(path: string): T | null {
		return this.memo(`json:${path}`, () => {
			const contents = this.text(path);

			try {
				return contents === null ? null : (JSON.parse(contents) as T);
			} catch {
				return null;
			}
		});
	}

	exists(path: string): boolean {
		return this.memo(`exists:${path}`, () => existsSync(join(this.root, path)));
	}

	files(pattern: string): string[] {
		return this.memo(`files:${pattern}`, () => {
			const found = globSync(pattern, {
				cwd: this.root,
				withFileTypes: true,
				exclude: (entry) => PRUNED.has(entry.name),
			});

			return found
				.filter((entry) => entry.isFile())
				.map((entry) => relative(this.root, join(entry.parentPath, entry.name)))
				.sort();
		});
	}

	count(pattern: string): number {
		return this.files(pattern).length;
	}

	installed(name: string): string | null {
		return this.memo(`installed:${name}`, () => {
			for (const registry of this.registries) {
				const version = registry(this, name);

				if (version !== null) return version;
			}

			return null;
		});
	}

	private memo<T>(key: string, compute: () => T): T {
		if (!this.cache.has(key)) this.cache.set(key, compute());

		return this.cache.get(key) as T;
	}
}

function packages(probe: Inspector, source: string): Package[] {
	const index = probe.json<Index | Package[]>(source);

	if (index === null) return [];
	if (Array.isArray(index)) return index;

	return [...(index.packages ?? []), ...(index['packages-dev'] ?? [])];
}
