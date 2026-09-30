import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { Collection, Directory, File, FileQuery } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-file-query-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('FileQuery', () => {
	it('gets only direct files', () => {
		GivenFile('readme.md');
		GivenDirectory('docs');
		GivenSymlink('shortcut', 'readme.md');

		const files = WhenGetting(GivenQuery());

		expect(files.pluck('name').toArray()).toEqual(['readme.md']);
	});

	it('does not descend into nested directories', () => {
		GivenDirectory('docs');
		GivenFile('docs/note.md');

		expect(WhenGetting(GivenQuery()).isEmpty()).toBe(true);
	});

	it('returns files as File models', () => {
		const readme = GivenFile('readme.md');

		const first = WhenGettingFirst(GivenQuery());

		expect(first).toBeInstanceOf(File);
		expect(first?.path).toBe(readme.path);
	});

	it('filters files by extension', () => {
		GivenFile('one.md');
		GivenFile('two.txt');

		const files = WhenGetting(GivenQuery().withExtension('md'));

		expect(files.pluck('name').toArray()).toEqual(['one.md']);
	});

	it('accepts an extension with a leading dot', () => {
		GivenFile('one.md');

		expect(WhenGetting(GivenQuery().withExtension('.md')).pluck('name').toArray()).toEqual(['one.md']);
	});

	it('filters files by a multi-part extension', () => {
		GivenFile('types.d.ts');
		GivenFile('main.ts');

		const files = WhenGetting(GivenQuery().withExtension('d.ts'));

		expect(files.pluck('name').toArray()).toEqual(['types.d.ts']);
	});

	it('matches the final part of a multi-part extension', () => {
		GivenFile('types.d.ts');
		GivenFile('main.ts');
		GivenFile('notes.md');

		const files = WhenGetting(GivenQuery().withExtension('ts'));

		expect(files.pluck('name').toArray().sort()).toEqual(['main.ts', 'types.d.ts']);
	});

	it('applies the extension to first, exists and count', () => {
		GivenFile('notes.txt');
		GivenFile('one.md');
		GivenFile('two.md');
		const markdown = GivenQuery().withExtension('md');
		const images = GivenQuery().withExtension('png');

		expect(WhenGettingFirst(markdown)?.name).toMatch(/\.md$/);
		expect(WhenCheckingQuery(markdown)).toBe(true);
		expect(WhenCounting(markdown)).toBe(2);
		expect(WhenCheckingQuery(images)).toBe(false);
	});

	it('leaves the original query unfiltered', () => {
		GivenFile('one.md');
		GivenFile('two.txt');
		const all = GivenQuery();

		WhenFilteringByExtension(all, 'md');

		expect(WhenCounting(all)).toBe(2);
	});

	it('includes hidden files', () => {
		GivenFile('.env');

		expect(WhenGetting(GivenQuery()).pluck('name').toArray()).toEqual(['.env']);
	});

	it('reads through a symlinked directory', () => {
		GivenDirectory('docs');
		GivenFile('docs/readme.md');
		GivenSymlink('shortcut', 'docs');

		const files = WhenGetting(GivenQuery('shortcut'));

		expect(files.pluck('name').toArray()).toEqual(['readme.md']);
	});

	it('does not read the filesystem while configuring', () => {
		const query = GivenQuery('missing').withExtension('md');

		expect(query).toBeInstanceOf(FileQuery);
		expect(WhenCheckingPathExists(join(root, 'missing'))).toBe(false);
	});

	it('hands results to the collection for further work', () => {
		GivenFile('.hidden.md');
		GivenFile('SKILL.md');
		GivenFile('notes.txt');

		const visible = WhenGetting(GivenQuery().withExtension('md'))
			.reject((file) => file.name.startsWith('.'))
			.pluck('name');

		expect(visible.toArray()).toEqual(['SKILL.md']);
	});

	it('infers a collection of files', () => {
		expectTypeOf(WhenGetting(GivenQuery())).toEqualTypeOf<Collection<File>>();
	});
});

function GivenQuery(path = '.'): FileQuery {
	return new Directory(root).directory(path).files();
}

function GivenFile(path: string): File {
	const file = new Directory(root).file(path);
	writeFileSync(file.path, 'sample');
	return file;
}

function GivenDirectory(path: string): void {
	mkdirSync(join(root, path), { recursive: true });
}

function GivenSymlink(path: string, target: string): void {
	symlinkSync(target, join(root, path));
}

function WhenGetting(query: FileQuery): Collection<File> {
	return query.get();
}

function WhenGettingFirst(query: FileQuery): File | null {
	return query.first();
}

function WhenCheckingQuery(query: FileQuery): boolean {
	return query.exists();
}

function WhenCounting(query: FileQuery): number {
	return query.count();
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}

function WhenFilteringByExtension(query: FileQuery, extension: string): FileQuery {
	return query.withExtension(extension);
}
