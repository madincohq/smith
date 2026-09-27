import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';

export interface WriteFile {
	readonly path: string;
	readonly contents: string;
}

export const Files = {
	existing(files: WriteFile[]): string[] {
		return files.filter((file) => existsSync(file.path)).map((file) => file.path);
	},

	containing(from: string, target: string): string | null {
		for (let directory = resolve(from); ; directory = dirname(directory)) {
			if (existsSync(join(directory, target))) return directory;
			if (directory === parse(directory).root) return null;
		}
	},

	write(files: WriteFile[]): void {
		for (const file of files) {
			mkdirSync(dirname(file.path), { recursive: true });
			writeFileSync(file.path, file.contents);
		}
	},
};
