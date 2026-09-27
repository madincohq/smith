import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Find } from './find.js';

export interface File {
	readonly path: string;
	readonly contents: string;
}

export const Files = {
	existing(files: File[]): string[] {
		return files.filter((file) => existsSync(file.path)).map((file) => file.path);
	},

	json<T = Record<string, unknown>>(path: string): T | null {
		try {
			return JSON.parse(readFileSync(path, 'utf8')) as T;
		} catch {
			return null;
		}
	},

	containing(from: string, target: string): string | null {
		return Find.nearest(from, Find.containing(target));
	},

	write(files: File[]): void {
		for (const file of files) {
			mkdirSync(dirname(file.path), { recursive: true });
			writeFileSync(file.path, file.contents);
		}
	},
};
