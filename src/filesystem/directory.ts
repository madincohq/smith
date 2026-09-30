import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { File } from './file.js';
import { DirectoryQuery } from './queries/directory-query.js';
import { FileQuery } from './queries/file-query.js';
import { SymlinkQuery } from './queries/symlink-query.js';
import { Symlink } from './symlink.js';

export class Directory {
	readonly path: string;
	readonly name: string;

	constructor(path: string) {
		this.path = resolve(path);
		this.name = basename(this.path);
	}

	directory(path: string): Directory {
		return new Directory(resolve(this.path, path));
	}

	file(path: string): File {
		return new File(resolve(this.path, path));
	}

	symlink(path: string): Symlink {
		return new Symlink(resolve(this.path, path));
	}

	files(): FileQuery {
		return new FileQuery(this);
	}

	folders(): DirectoryQuery {
		return new DirectoryQuery(this);
	}

	symlinks(): SymlinkQuery {
		return new SymlinkQuery(this);
	}

	parent(): Directory {
		return new Directory(dirname(this.path));
	}

	exists(): boolean {
		return existsSync(this.path) && lstatSync(this.path).isDirectory();
	}

	ensure(): this {
		mkdirSync(this.path, { recursive: true });
		return this;
	}
}
