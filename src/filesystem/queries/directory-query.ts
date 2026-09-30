import type { Dirent } from 'node:fs';
import type { Directory } from '../directory.js';
import { EntryQuery, entries } from './entry-query.js';

export class DirectoryQuery extends EntryQuery<Directory> {
	constructor(
		directory: Directory,
		private readonly containedFile?: string,
	) {
		super(directory);
	}

	containingFile(name: string): DirectoryQuery {
		return new DirectoryQuery(this.directory, name);
	}

	protected matches(entry: Dirent): boolean {
		if (!entry.isDirectory()) return false;
		if (this.containedFile === undefined) return true;
		const child = this.directory.directory(entry.name);
		return entries(child.path)
			.some((file) => file.name === this.containedFile && file.isFile());
	}

	protected make(entry: Dirent): Directory {
		return this.directory.directory(entry.name);
	}
}
