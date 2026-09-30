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
	it('normalizes its path and exposes its name', () => {
		const path = GivenPath(['copper', '..', 'marble.txt']);
		const expectedPath = GivenPath(['marble.txt']);
		const file = GivenFile(path);

		expect(file.path).toBe(expectedPath);
		expect(file.name).toBe('marble.txt');
	});

	it('returns its parent directory', () => {
		const file = GivenFile(GivenPath(['orbit.txt']));
		const parent = WhenGettingParentOf(file);

		expect(parent).toBeInstanceOf(Directory);
		expect(parent.path).toBe(GivenPath([]));
	});

	it('exists only when the file is present', () => {
		const existing = GivenExistingFile(GivenPath(['violet.txt']), 'hello');
		const missing = GivenFile(GivenPath(['indigo.txt']));

		expect(WhenCheckingExistenceOf(existing)).toBe(true);
		expect(WhenCheckingExistenceOf(missing)).toBe(false);
	});

	it('does not mistake a directory or a path below a file for a file', () => {
		GivenExistingFile(GivenPath(['ledger.txt']), 'hello');
		const directoryAsFile = GivenFile(GivenPath([]));
		const childAsFile = GivenFile(GivenPath(['ledger.txt', 'child']));

		expect(WhenCheckingExistenceOf(directoryAsFile)).toBe(false);
		expect(WhenCheckingExistenceOf(childAsFile)).toBe(false);
	});

	it('reads its UTF-8 contents', () => {
		const file = GivenExistingFile(GivenPath(['quartz.txt']), 'café');

		expect(WhenReadingFile(file)).toBe('café');
	});

	it('throws when reading a missing file without creating it', () => {
		const file = GivenFile(GivenPath(['missing.txt']));

		expect(() => WhenReadingFile(file)).toThrowError(/ENOENT/);
		expect(WhenCheckingPathExists(file.path)).toBe(false);
	});

	it('does not touch the filesystem when constructed', () => {
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
