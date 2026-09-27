import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Directory, File } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-directory-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('Directory', () => {
	it('given a path, when describing a directory, then exposes its path and name', () => {
		const path = GivenPath(['copper', '..', 'marble']);
		const expectedPath = GivenPath(['marble']);
		const directory = GivenDirectory(path);

		expect(directory.path).toBe(expectedPath);
		expect(directory.name).toBe('marble');
	});

	it('given a relative path, when describing a directory, then makes its path absolute', () => {
		const directory = GivenDirectory('.');

		expect(directory.path).toBe(process.cwd());
	});

	it('given a directory, when composing nested paths, then returns directories and files', () => {
		const directory = GivenDirectory(GivenPath([]));
		const branch = directory.directory('cobalt');
		const document = branch.directory('violet').file('ledger.txt');

		expect(branch).toBeInstanceOf(Directory);
		expect(document).toBeInstanceOf(File);
		expect(document.path).toBe(GivenPath(['cobalt', 'violet', 'ledger.txt']));
		expect(document.name).toBe('ledger.txt');
		expect(branch.file('violet/../index.txt').path).toBe(GivenPath(['cobalt', 'index.txt']));
	});

	it('given a nested directory, when asking for its parent, then returns the parent directory', () => {
		const directory = GivenDirectory(GivenPath(['cedar', 'granite']));
		const parent = WhenGettingParentOf(directory);

		expect(parent).toBeInstanceOf(Directory);
		expect(parent.path).toBe(GivenPath(['cedar']));
	});

	it('given existing and missing directories, when checking existence, then distinguishes them', () => {
		const existing = GivenExistingDirectory(GivenPath(['amber']));
		const missing = GivenDirectory(GivenPath(['indigo']));

		expect(WhenCheckingExistenceOf(existing)).toBe(true);
		expect(WhenCheckingExistenceOf(missing)).toBe(false);
	});

	it('given a file, when checking it as a directory, then neither it nor its child exists as one', () => {
		const file = GivenExistingFile(GivenPath(['orbit.txt']));
		const fileAsDirectory = GivenDirectory(file.path);
		const childAsDirectory = GivenDirectory(GivenPath(['orbit.txt', 'child']));

		expect(WhenCheckingExistenceOf(fileAsDirectory)).toBe(false);
		expect(WhenCheckingExistenceOf(childAsDirectory)).toBe(false);
	});

	it('given a missing nested directory, when ensuring it, then creates it and returns itself', () => {
		const directory = GivenDirectory(GivenPath(['pine', 'quartz']));

		expect(WhenEnsuringDirectory(directory)).toBe(directory);
		expect(WhenCheckingExistenceOf(directory)).toBe(true);
	});

	it('given an existing directory, when ensuring it, then returns itself', () => {
		const directory = GivenExistingDirectory(GivenPath(['maple']));

		expect(WhenEnsuringDirectory(directory)).toBe(directory);
		expect(WhenCheckingExistenceOf(directory)).toBe(true);
	});

	it('given paths with no entries, when composing them, then creates nothing on disk', () => {
		const directory = GivenDirectory(GivenPath(['unmade', 'birch']));
		const document = directory.directory('elm').file('draft.txt');

		expect(document.path).toBe(GivenPath(['unmade', 'birch', 'elm', 'draft.txt']));
		expect(WhenCheckingPathExists(GivenPath(['unmade']))).toBe(false);
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

function WhenGettingParentOf(directory: Directory): Directory {
	return directory.parent();
}

function WhenCheckingExistenceOf(directory: Directory): boolean {
	return directory.exists();
}

function WhenEnsuringDirectory(directory: Directory): Directory {
	return directory.ensure();
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}
