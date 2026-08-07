import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface File {
	readonly path: string;
	readonly contents: string;
}

export const Files = {
	existing(files: File[]): string[] {
		return files.filter((file) => existsSync(file.path)).map((file) => file.path);
	},

	write(files: File[]): void {
		for (const file of files) {
			mkdirSync(dirname(file.path), { recursive: true });
			writeFileSync(file.path, file.contents);
		}
	},
};
