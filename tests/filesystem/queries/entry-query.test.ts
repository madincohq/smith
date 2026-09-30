import { mkdirSync, mkdtempSync, rmSync, writeFileSync, type Dirent } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Collection, Directory } from '@';
import { EntryQuery, entries } from '@/filesystem/queries/entry-query';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-entry-query-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

class MarkdownNames extends EntryQuery<string> {
	protected matches(entry: Dirent): boolean {
		return entry.name.endsWith('.md');
	}

	protected make(entry: Dirent): string {
		return entry.name.toUpperCase();
	}
}

describe('EntryQuery', () => {
	it('gets every matching entry as a collection of made items', () => {
		GivenFile('one.md');
		GivenFile('two.md');
		GivenFile('notes.txt');

		const names = WhenGetting(GivenQuery(root));

		expect(names).toBeInstanceOf(Collection);
		expect(names.toArray().sort()).toEqual(['ONE.MD', 'TWO.MD']);
	});

	it('returns the first matching entry as a made item', () => {
		GivenFile('notes.txt');
		GivenFile('readme.md');

		expect(WhenGettingFirst(GivenQuery(root))).toBe('README.MD');
	});

	it('returns no first item when nothing matches', () => {
		GivenFile('notes.txt');

		expect(WhenGettingFirst(GivenQuery(root))).toBeNull();
	});

	it('exists only when an entry matches', () => {
		GivenFile('notes.txt');
		const query = GivenQuery(root);

		expect(WhenCheckingQuery(query)).toBe(false);

		GivenFile('readme.md');

		expect(WhenCheckingQuery(query)).toBe(true);
	});

	it('counts only matching entries', () => {
		GivenFile('one.md');
		GivenFile('two.md');
		GivenFile('notes.txt');

		expect(WhenCounting(GivenQuery(root))).toBe(2);
	});

	it('reads the directory again on every call', () => {
		const query = GivenQuery(root);

		expect(WhenCounting(query)).toBe(0);

		GivenFile('readme.md');

		expect(WhenCounting(query)).toBe(1);
	});

	it('yields no matches in a missing directory', () => {
		const query = GivenQuery(join(root, 'missing'));

		expect(WhenGetting(query).isEmpty()).toBe(true);
		expect(WhenGettingFirst(query)).toBeNull();
		expect(WhenCheckingQuery(query)).toBe(false);
		expect(WhenCounting(query)).toBe(0);
	});
});

describe('entries', () => {
	it('lists the direct entries of a directory', () => {
		GivenFile('readme.md');
		GivenDirectory('docs/nested');

		const listed = WhenListing(root);

		expect(listed.map((entry) => entry.name).sort()).toEqual(['docs', 'readme.md']);
	});

	it('lists nothing for a missing directory', () => {
		expect(WhenListing(join(root, 'missing'))).toEqual([]);
	});

	it('lists nothing when a file sits where the directory should be', () => {
		GivenFile('readme.md');

		expect(WhenListing(join(root, 'readme.md'))).toEqual([]);
	});
});

function GivenQuery(path: string): MarkdownNames {
	return new MarkdownNames(new Directory(path));
}

function GivenFile(path: string): void {
	writeFileSync(join(root, path), 'sample');
}

function GivenDirectory(path: string): void {
	mkdirSync(join(root, path), { recursive: true });
}

function WhenGetting(query: MarkdownNames): Collection<string> {
	return query.get();
}

function WhenGettingFirst(query: MarkdownNames): string | null {
	return query.first();
}

function WhenCheckingQuery(query: MarkdownNames): boolean {
	return query.exists();
}

function WhenCounting(query: MarkdownNames): number {
	return query.count();
}

function WhenListing(path: string): Dirent[] {
	return entries(path);
}
