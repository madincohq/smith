import { readdirSync, type Dirent } from 'node:fs';
import { Collection } from '../../support/collection.js';
import type { Directory } from '../directory.js';

const ABSENT = new Set(['ENOENT', 'ENOTDIR']);

export abstract class EntryQuery<T> {
	constructor(protected readonly directory: Directory) {}

	get(): Collection<T> {
		return new Collection(this.matching().map((entry) => this.make(entry)));
	}

	first(): T | null {
		const entry = entries(this.directory.path).find((entry) => this.matches(entry));
		return entry ? this.make(entry) : null;
	}

	exists(): boolean {
		return entries(this.directory.path).some((entry) => this.matches(entry));
	}

	count(): number {
		return this.matching().length;
	}

	protected abstract matches(entry: Dirent): boolean;

	protected abstract make(entry: Dirent): T;

	private matching(): Dirent[] {
		return entries(this.directory.path).filter((entry) => this.matches(entry));
	}
}

export function entries(path: string): Dirent[] {
	try {
		return readdirSync(path, { withFileTypes: true });
	} catch (error) {
		if (ABSENT.has((error as NodeJS.ErrnoException).code ?? '')) return [];
		throw error;
	}
}
