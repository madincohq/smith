import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Files } from '@';

let directory = '';

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'files-'));
});

afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
});

describe('existing', () => {
	it('reports the files that are already there', () => {
		writeFileSync(join(directory, 'taken.md'), 'mine');

		const clashes = Files.existing([
			{ path: join(directory, 'taken.md'), contents: 'new' },
			{ path: join(directory, 'free.md'), contents: 'new' },
		]);

		expect(clashes).toEqual([join(directory, 'taken.md')]);
	});

	it('reports nothing when every path is free', () => {
		expect(Files.existing([{ path: join(directory, 'free.md'), contents: 'new' }])).toEqual([]);
	});
});

describe('write', () => {
	it('writes every file', () => {
		Files.write([
			{ path: join(directory, 'one.md'), contents: 'first' },
			{ path: join(directory, 'two.md'), contents: 'second' },
		]);

		expect(readFileSync(join(directory, 'one.md'), 'utf8')).toBe('first');
		expect(readFileSync(join(directory, 'two.md'), 'utf8')).toBe('second');
	});

	it('creates the directories a path needs', () => {
		Files.write([{ path: join(directory, 'en/notes/deep.md'), contents: 'nested' }]);

		expect(readFileSync(join(directory, 'en/notes/deep.md'), 'utf8')).toBe('nested');
	});

	it('overwrites what is already there', () => {
		writeFileSync(join(directory, 'taken.md'), 'mine');
		Files.write([{ path: join(directory, 'taken.md'), contents: 'theirs' }]);

		expect(readFileSync(join(directory, 'taken.md'), 'utf8')).toBe('theirs');
	});

	it('writes nothing for an empty list', () => {
		Files.write([]);

		expect(existsSync(directory)).toBe(true);
	});
});
