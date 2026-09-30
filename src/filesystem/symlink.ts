import { existsSync, lstatSync, readlinkSync, symlinkSync, type Stats } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { Directory } from './directory.js';
import type { File } from './file.js';

type Source = File | Directory;
type ExistingEntry = 'symlink' | 'file' | 'directory' | 'other';

export class SymlinkConflict extends Error {
	constructor(
		readonly destinationPath: string,
		readonly existingEntry: ExistingEntry,
		readonly sourcePath: string,
	) {
		super(`Cannot link ${destinationPath} to ${sourcePath}: a ${existingEntry} already exists at the destination`);
		this.name = 'SymlinkConflict';
	}
}

export class Symlink {
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
		try {
			return lstatSync(this.path, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOTDIR') return false;
			throw error;
		}
	}

	targetPath(): string {
		return resolve(dirname(this.path), readlinkSync(this.path));
	}

	isBroken(): boolean {
		return this.exists() && !existsSync(this.path);
	}

	pointsTo(source: Source): boolean {
		return this.exists() && this.targetPath() === source.path;
	}

	to(source: Source): this {
		const existing = lstatSync(this.path, { throwIfNoEntry: false });
		if (existing) return inspectExisting(this, existing, source);

		try {
			symlinkSync(source.path, this.path, source instanceof Directory ? 'dir' : 'file');
		} catch (error) {
			if (!isAlreadyExists(error)) throw error;
			const raced = lstatSync(this.path, { throwIfNoEntry: false });
			if (!raced) throw error;
			return inspectExisting(this, raced, source);
		}

		return this;
	}
}

function inspectExisting<T extends Symlink>(link: T, existing: Stats, source: Source): T {
	if (existing.isSymbolicLink() && link.pointsTo(source)) return link;

	const kind: ExistingEntry = existing.isSymbolicLink()
		? 'symlink'
		: existing.isFile()
			? 'file'
			: existing.isDirectory()
				? 'directory'
				: 'other';
	throw new SymlinkConflict(link.path, kind, source.path);
}

function isAlreadyExists(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
