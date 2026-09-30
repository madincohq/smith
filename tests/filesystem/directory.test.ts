import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Directory, DirectoryQuery, File, FileQuery, Symlink, SymlinkQuery } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-directory-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('Directory', () => {
	it('normalizes its path and exposes its name', () => {
		const path = GivenPath(['copper', '..', 'marble']);
		const expectedPath = GivenPath(['marble']);
		const directory = GivenDirectory(path);

		expect(directory.path).toBe(expectedPath);
		expect(directory.name).toBe('marble');
	});

	it('resolves a relative path from the working directory', () => {
		const directory = GivenDirectory('.');

		expect(directory.path).toBe(process.cwd());
	});

	it('resolves nested directory and file paths relative to itself', () => {
		const directory = GivenDirectory(GivenPath([]));
		const branch = directory.directory('cobalt');
		const document = branch.directory('violet').file('ledger.txt');

		expect(branch).toBeInstanceOf(Directory);
		expect(document).toBeInstanceOf(File);
		expect(document.path).toBe(GivenPath(['cobalt', 'violet', 'ledger.txt']));
		expect(document.name).toBe('ledger.txt');
		expect(branch.file('violet/../index.txt').path).toBe(GivenPath(['cobalt', 'index.txt']));
	});

	it('resolves a symlink path relative to the directory', () => {
		const directory = GivenDirectory(GivenPath(['cobalt']));

		const link = directory.symlink('violet/../shortcut');

		expect(link).toBeInstanceOf(Symlink);
		expect(link.path).toBe(GivenPath(['cobalt', 'shortcut']));
	});

	it('does not create entries when describing a symlink', () => {
		const directory = GivenDirectory(GivenPath(['unmade']));

		const link = directory.symlink('shortcut');

		expect(link.path).toBe(GivenPath(['unmade', 'shortcut']));
		expect(WhenCheckingPathExists(directory.path)).toBe(false);
	});

	it('returns its parent directory', () => {
		const directory = GivenDirectory(GivenPath(['cedar', 'granite']));
		const parent = WhenGettingParentOf(directory);

		expect(parent).toBeInstanceOf(Directory);
		expect(parent.path).toBe(GivenPath(['cedar']));
	});

	it('exists only when the directory is present', () => {
		const existing = GivenExistingDirectory(GivenPath(['amber']));
		const missing = GivenDirectory(GivenPath(['indigo']));

		expect(WhenCheckingExistenceOf(existing)).toBe(true);
		expect(WhenCheckingExistenceOf(missing)).toBe(false);
	});

	it('does not mistake a file or a path below it for a directory', () => {
		const file = GivenExistingFile(GivenPath(['orbit.txt']));
		const fileAsDirectory = GivenDirectory(file.path);
		const childAsDirectory = GivenDirectory(GivenPath(['orbit.txt', 'child']));

		expect(WhenCheckingExistenceOf(fileAsDirectory)).toBe(false);
		expect(WhenCheckingExistenceOf(childAsDirectory)).toBe(false);
	});

	it('creates missing nested directories when ensured', () => {
		const directory = GivenDirectory(GivenPath(['pine', 'quartz']));

		expect(WhenEnsuringDirectory(directory)).toBe(directory);
		expect(WhenCheckingExistenceOf(directory)).toBe(true);
	});

	it('returns itself when ensuring an existing directory', () => {
		const directory = GivenExistingDirectory(GivenPath(['maple']));

		expect(WhenEnsuringDirectory(directory)).toBe(directory);
		expect(WhenCheckingExistenceOf(directory)).toBe(true);
	});

	it('does not create entries when composing paths', () => {
		const directory = GivenDirectory(GivenPath(['unmade', 'birch']));
		const document = directory.directory('elm').file('draft.txt');

		expect(document.path).toBe(GivenPath(['unmade', 'birch', 'elm', 'draft.txt']));
		expect(WhenCheckingPathExists(GivenPath(['unmade']))).toBe(false);
	});

	it('queries its own files', () => {
		const directory = GivenPopulatedDirectory();

		const files = WhenQueryingFiles(directory);

		expect(files).toBeInstanceOf(FileQuery);
		expect(files.get().pluck('path').toArray()).toEqual([GivenPath(['cobalt', 'ledger.txt'])]);
	});

	it('queries its own folders', () => {
		const directory = GivenPopulatedDirectory();

		const folders = WhenQueryingFolders(directory);

		expect(folders).toBeInstanceOf(DirectoryQuery);
		expect(folders.get().pluck('path').toArray()).toEqual([GivenPath(['cobalt', 'violet'])]);
	});

	it('queries its own symlinks', () => {
		const directory = GivenPopulatedDirectory();

		const symlinks = WhenQueryingSymlinks(directory);

		expect(symlinks).toBeInstanceOf(SymlinkQuery);
		expect(symlinks.get().pluck('path').toArray()).toEqual([GivenPath(['cobalt', 'shortcut'])]);
	});
});

function GivenPath(segments: string[]): string {
	return [root, ...segments].join(sep);
}

function GivenDirectory(path: string): Directory {
	return new Directory(path);
}

function GivenExistingDirectory(path: string): Directory {
	mkdirSync(path, { recursive: true });
	return new Directory(path);
}

function GivenExistingFile(path: string): File {
	writeFileSync(path, 'sample');
	return new File(path);
}

function GivenExistingSymlink(path: string, target: string): Symlink {
	symlinkSync(target, path);
	return new Symlink(path);
}

function GivenPopulatedDirectory(): Directory {
	const directory = GivenExistingDirectory(GivenPath(['cobalt']));
	GivenExistingFile(GivenPath(['cobalt', 'ledger.txt']));
	GivenExistingDirectory(GivenPath(['cobalt', 'violet', 'nested']));
	GivenExistingFile(GivenPath(['cobalt', 'violet', 'inner.txt']));
	GivenExistingSymlink(GivenPath(['cobalt', 'shortcut']), 'ledger.txt');
	return directory;
}

function WhenGettingParentOf(directory: Directory): Directory {
	return directory.parent();
}

function WhenCheckingExistenceOf(directory: Directory): boolean {
	return directory.exists();
}

function WhenEnsuringDirectory(directory: Directory): Directory {
	return directory.ensure();
}

function WhenQueryingFiles(directory: Directory): FileQuery {
	return directory.files();
}

function WhenQueryingFolders(directory: Directory): DirectoryQuery {
	return directory.folders();
}

function WhenQueryingSymlinks(directory: Directory): SymlinkQuery {
	return directory.symlinks();
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}
