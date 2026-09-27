import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { basename, dirname, join, matchesGlob, relative, resolve } from 'node:path';

export interface Found {
	readonly name: string;
	readonly path: string;
	readonly absolute: string;
	readonly directory: boolean;
}

export type Matcher = (found: Found) => boolean;

export interface Search {
	readonly include: Matcher;
	readonly exclude?: Matcher;
}

export const Find = {
	nearest(from: string, matcher: Matcher): string | null {
		const start = resolve(from);

		for (let directory = start; ; directory = dirname(directory)) {
			if (matcher(Find.at(start, relative(start, directory)))) return directory;
			if (directory === dirname(directory)) return null;
		}
	},

	within(root: string, search: Search): string[] {
		const found: string[] = [];
		const descend = (directory: string): void => {
			for (const name of readdirSync(join(root, directory)).sort()) {
				const entry = Find.at(root, join(directory, name));

				if (search.exclude?.(entry)) continue;
				if (search.include(entry)) found.push(entry.path);
				else if (entry.directory) descend(entry.path);
			}
		};

		if (existsSync(root)) descend('');

		return found.sort((one, other) => one.localeCompare(other));
	},

	at(root: string, path: string): Found {
		const absolute = resolve(root, path);

		return {
			name: basename(absolute),
			path: path || '.',
			absolute,
			directory: lstatSync(absolute, { throwIfNoEntry: false })?.isDirectory() ?? false,
		};
	},

	containing(...markers: string[]): Matcher {
		return (found) => found.directory && markers.some((marker) => existsSync(join(found.absolute, marker)));
	},

	named(...names: string[]): Matcher {
		return (found) => names.includes(found.name);
	},

	glob(...patterns: string[]): Matcher {
		return (found) => patterns.some((pattern) => matchesGlob(found.path, pattern));
	},

	extension(...extensions: string[]): Matcher {
		return (found) => !found.directory && extensions.some((extension) => found.name.endsWith(extension));
	},
};
