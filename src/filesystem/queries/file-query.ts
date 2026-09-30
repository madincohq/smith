import type { Dirent } from 'node:fs';
import type { Directory } from '../directory.js';
import type { File } from '../file.js';
import { EntryQuery } from './entry-query.js';

export class FileQuery extends EntryQuery<File> {
	constructor(
		directory: Directory,
		private readonly extension?: string,
	) {
		super(directory);
	}

	withExtension(extension: string): FileQuery {
		return new FileQuery(this.directory, extension.replace(/^\./, ''));
	}

	protected matches(entry: Dirent): boolean {
		return entry.isFile() && (this.extension === undefined || entry.name.endsWith(`.${this.extension}`));
	}

	protected make(entry: Dirent): File {
		return this.directory.file(entry.name);
	}
}
