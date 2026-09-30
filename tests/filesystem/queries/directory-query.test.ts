import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { Collection, Directory, DirectoryQuery } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-directory-query-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('DirectoryQuery', () => {
	it('gets only direct folders', () => {
		GivenFile('readme.md');
		GivenDirectory('docs');
		GivenSymlink('shortcut', 'docs');

		const folders = WhenGetting(GivenQuery());

		expect(folders.pluck('name').toArray()).toEqual(['docs']);
	});

	it('does not descend into nested directories', () => {
		GivenDirectory('docs/nested');

		expect(WhenGetting(GivenQuery()).pluck('name').toArray()).toEqual(['docs']);
	});

	it('returns folders as Directory models', () => {
		const docs = GivenDirectory('docs');

		const first = WhenGettingFirst(GivenQuery());

		expect(first).toBeInstanceOf(Directory);
		expect(first?.path).toBe(docs.path);
	});

	it('filters folders by a file they directly contain', () => {
		GivenDirectory('skills');
		GivenDirectory('other');
		GivenFile('skills/SKILL.md');

		const folders = WhenGetting(GivenQuery().containingFile('SKILL.md'));

		expect(folders.pluck('name').toArray()).toEqual(['skills']);
	});

	it('does not match a folder whose file is only in a descendant', () => {
		GivenDirectory('skills/nested');
		GivenFile('skills/nested/SKILL.md');

		expect(WhenCounting(GivenQuery().containingFile('SKILL.md'))).toBe(0);
	});

	it('does not match a folder whose entry of that name is a directory', () => {
		GivenDirectory('skills/SKILL.md');

		expect(WhenCounting(GivenQuery().containingFile('SKILL.md'))).toBe(0);
	});

	it('does not read the filesystem while configuring', () => {
		const query = GivenQuery('missing').containingFile('SKILL.md');

		expect(query).toBeInstanceOf(DirectoryQuery);
		expect(WhenCheckingPathExists(join(root, 'missing'))).toBe(false);
	});

	it('infers a collection of directories', () => {
		expectTypeOf(WhenGetting(GivenQuery())).toEqualTypeOf<Collection<Directory>>();
	});
});

function GivenQuery(path = '.'): DirectoryQuery {
	return new Directory(root).directory(path).folders();
}

function GivenFile(path: string): void {
	writeFileSync(join(root, path), 'sample');
}

function GivenDirectory(path: string): Directory {
	const directory = new Directory(root).directory(path);
	mkdirSync(directory.path, { recursive: true });
	return directory;
}

function GivenSymlink(path: string, target: string): void {
	symlinkSync(target, join(root, path));
}

function WhenGetting(query: DirectoryQuery): Collection<Directory> {
	return query.get();
}

function WhenGettingFirst(query: DirectoryQuery): Directory | null {
	return query.first();
}

function WhenCounting(query: DirectoryQuery): number {
	return query.count();
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}
