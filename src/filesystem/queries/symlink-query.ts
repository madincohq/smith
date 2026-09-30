import type { Dirent } from 'node:fs';
import type { Directory } from '../directory.js';
import type { File } from '../file.js';
import type { Symlink } from '../symlink.js';
import { EntryQuery } from './entry-query.js';

interface Criteria {
	readonly broken?: true;
	readonly source?: File | Directory;
}

export class SymlinkQuery extends EntryQuery<Symlink> {
	constructor(
		directory: Directory,
		private readonly criteria: Criteria = {},
	) {
		super(directory);
	}

	broken(): SymlinkQuery {
		return new SymlinkQuery(this.directory, { ...this.criteria, broken: true });
	}

	pointingTo(source: File | Directory): SymlinkQuery {
		return new SymlinkQuery(this.directory, { ...this.criteria, source });
	}

	protected matches(entry: Dirent): boolean {
		if (!entry.isSymbolicLink()) return false;
		const link = this.make(entry);
		if (this.criteria.broken && !link.isBroken()) return false;
		return this.criteria.source === undefined || link.pointsTo(this.criteria.source);
	}

	protected make(entry: Dirent): Symlink {
		return this.directory.symlink(entry.name);
	}
}
