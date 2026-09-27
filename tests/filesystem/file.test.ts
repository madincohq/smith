import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Directory, File } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-file-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('File', () => {
	it('given a path, when describing a file, then exposes its path and name', () => {
		const path = GivenPath(['copper', '..', 'marble.txt']);
		const expectedPath = GivenPath(['marble.txt']);
		const file = GivenFile(path);

		expect(file.path).toBe(expectedPath);
		expect(file.name).toBe('marble.txt');
	});

	it('given a file, when asking for its parent, then returns the parent directory', () => {
		const file = GivenFile(GivenPath(['orbit.txt']));
		const parent = WhenGettingParentOf(file);

		expect(parent).toBeInstanceOf(Directory);
		expect(parent.path).toBe(GivenPath([]));
	});

	it('given existing and missing files, when checking existence, then distinguishes them', () => {
		const existing = GivenExistingFile(GivenPath(['violet.txt']), 'hello');
		const missing = GivenFile(GivenPath(['indigo.txt']));

		expect(WhenCheckingExistenceOf(existing)).toBe(true);
		expect(WhenCheckingExistenceOf(missing)).toBe(false);
	});

	it('given a directory and a child of a file, when checking them as files, then neither exists as one', () => {
		GivenExistingFile(GivenPath(['ledger.txt']), 'hello');
		const directoryAsFile = GivenFile(GivenPath([]));
		const childAsFile = GivenFile(GivenPath(['ledger.txt', 'child']));

		expect(WhenCheckingExistenceOf(directoryAsFile)).toBe(false);
		expect(WhenCheckingExistenceOf(childAsFile)).toBe(false);
	});

	it('given a file with UTF-8 text, when reading it, then returns its contents', () => {
		const file = GivenExistingFile(GivenPath(['quartz.txt']), 'café');

		expect(WhenReadingFile(file)).toBe('café');
	});

	it('given a missing file, when reading it, then raises an error without creating it', () => {
		const file = GivenFile(GivenPath(['missing.txt']));

		expect(() => WhenReadingFile(file)).toThrowError(/ENOENT/);
		expect(WhenCheckingPathExists(file.path)).toBe(false);
	});

	it('given a file with a missing parent, when describing it, then creates nothing on disk', () => {
		const file = GivenFile(GivenPath(['unmade', 'draft.txt']));

		expect(file.path).toBe(GivenPath(['unmade', 'draft.txt']));
		expect(WhenCheckingPathExists(GivenPath(['unmade']))).toBe(false);
	});
});

function GivenPath(segments: string[]): string {
	return [root, ...segments].join(sep);
}

function GivenFile(path: string): File {
	return new File(path);
}

function GivenExistingFile(path: string, contents: string): File {
	writeFileSync(path, contents);
	return new File(path);
}

function WhenGettingParentOf(file: File): Directory {
	return file.parent();
}

function WhenCheckingExistenceOf(file: File): boolean {
	return file.exists();
}

function WhenReadingFile(file: File): string {
	return file.read();
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}
