import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { Collection, Directory, File, Symlink, SymlinkQuery } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-symlink-query-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('SymlinkQuery', () => {
	it('gets only direct symlinks, broken or not', () => {
		GivenFile('readme.md');
		GivenDirectory('docs');
		GivenSymlink('working', 'readme.md');
		GivenSymlink('dangling', 'missing.md');

		const links = WhenGetting(GivenQuery());

		expect(links.pluck('name').toArray().sort()).toEqual(['dangling', 'working']);
	});

	it('does not descend into nested directories', () => {
		GivenDirectory('docs');
		GivenFile('docs/note.md');
		GivenSymlink('docs/shortcut', 'note.md');

		expect(WhenGetting(GivenQuery()).isEmpty()).toBe(true);
	});

	it('returns symlinks as Symlink models', () => {
		const link = GivenSymlink('shortcut', 'missing.md');

		const first = WhenGettingFirst(GivenQuery());

		expect(first).toBeInstanceOf(Symlink);
		expect(first?.path).toBe(link.path);
	});

	it('filters symlinks to broken ones', () => {
		GivenFile('readme.md');
		GivenSymlink('working', 'readme.md');
		GivenSymlink('dangling', 'missing.md');

		const links = WhenGetting(GivenQuery().broken());

		expect(links.pluck('name').toArray()).toEqual(['dangling']);
	});

	it('filters symlinks by the source they point to', () => {
		const readme = GivenFile('readme.md');
		GivenFile('notes.md');
		GivenSymlink('current', 'readme.md');
		GivenSymlink('other', 'notes.md');

		const links = WhenGetting(GivenQuery().pointingTo(readme));

		expect(links.pluck('name').toArray()).toEqual(['current']);
	});

	it('filters symlinks pointing to a directory', () => {
		const docs = GivenDirectory('docs');
		GivenSymlink('current', 'docs');
		GivenFile('readme.md');
		GivenSymlink('other', 'readme.md');

		expect(WhenGetting(GivenQuery().pointingTo(docs)).pluck('name').toArray()).toEqual(['current']);
	});

	it('combines filters in either order', () => {
		const missing = new Directory(root).file('missing.md');
		const readme = GivenFile('readme.md');
		GivenSymlink('dangling', 'missing.md');
		GivenSymlink('working', 'readme.md');

		expect(WhenCounting(GivenQuery().broken().pointingTo(missing))).toBe(1);
		expect(WhenCounting(GivenQuery().pointingTo(missing).broken())).toBe(1);
		expect(WhenCounting(GivenQuery().broken().pointingTo(readme))).toBe(0);
	});

	it('does not read the filesystem while configuring', () => {
		const query = GivenQuery('missing').broken().pointingTo(new Directory(root).file('missing.md'));

		expect(query).toBeInstanceOf(SymlinkQuery);
		expect(WhenCheckingPathExists(join(root, 'missing'))).toBe(false);
	});

	it('infers a collection of symlinks', () => {
		expectTypeOf(WhenGetting(GivenQuery())).toEqualTypeOf<Collection<Symlink>>();
	});
});

function GivenQuery(path = '.'): SymlinkQuery {
	return new Directory(root).directory(path).symlinks();
}

function GivenFile(path: string): File {
	const file = new Directory(root).file(path);
	writeFileSync(file.path, 'sample');
	return file;
}

function GivenDirectory(path: string): Directory {
	const directory = new Directory(root).directory(path);
	mkdirSync(directory.path, { recursive: true });
	return directory;
}

function GivenSymlink(path: string, target: string): Symlink {
	const link = new Directory(root).symlink(path);
	symlinkSync(target, link.path);
	return link;
}

function WhenGetting(query: SymlinkQuery): Collection<Symlink> {
	return query.get();
}

function WhenGettingFirst(query: SymlinkQuery): Symlink | null {
	return query.first();
}

function WhenCounting(query: SymlinkQuery): number {
	return query.count();
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}
