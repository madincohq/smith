import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { Directory } from './directory.js';

export class File {
	readonly path: string;
	readonly name: string;

	constructor(path: string) {
		this.path = resolve(path);
		this.name = basename(this.path);
	}

	parent(): Directory {
		return new Directory(dirname(this.path));
	}

	exists(): boolean {
		return existsSync(this.path) && lstatSync(this.path).isFile();
	}

	read(): string {
		return readFileSync(this.path, 'utf8');
	}
}
