import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

describe('containing', () => {
	it('finds the directory holding the target', () => {
		writeFileSync(join(directory, 'package.json'), '{}');

		expect(Files.containing(directory, 'package.json')).toBe(directory);
	});

	it('climbs to the nearest ancestor holding it', () => {
		writeFileSync(join(directory, 'package.json'), '{}');
		mkdirSync(join(directory, 'src', 'console'), { recursive: true });

		expect(Files.containing(join(directory, 'src/console'), 'package.json')).toBe(directory);
	});

	it('stops at the nearest one when an ancestor holds it too', () => {
		writeFileSync(join(directory, 'package.json'), '{}');

		const inner = join(directory, 'packages', 'site');
		mkdirSync(inner, { recursive: true });
		writeFileSync(join(inner, 'package.json'), '{}');

		expect(Files.containing(inner, 'package.json')).toBe(inner);
	});

	it('finds a target that is several segments deep', () => {
		const nested = join(directory, 'node_modules', '@madinco', 'smith');
		mkdirSync(nested, { recursive: true });
		writeFileSync(join(nested, 'index.js'), '');

		expect(Files.containing(directory, 'node_modules/@madinco/smith/index.js')).toBe(directory);
	});

	it('finds nothing when no ancestor holds it', () => {
		expect(Files.containing(directory, 'nothing-here.json')).toBeNull();
	});

	it('finds nothing when the directory it starts from is gone', () => {
		expect(Files.containing(join(directory, 'nope'), 'package.json')).toBeNull();
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
