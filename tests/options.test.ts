import { describe, expect, it } from 'vitest';
import { InvalidOption, flag, number, option, parse } from '@/options';

const options = {
	force: flag('Rebuild everything'),
	out: option('public', 'Output directory'),
	quality: number(82, 'Encoder quality'),
};

function values(argv: string[]) {
	return parse(argv, options).values;
}

describe('parse', () => {
	it('falls back to every declared default', () => {
		expect(values([])).toEqual({ force: false, out: 'public', quality: 82 });
	});

	it('reads a flag as a boolean', () => {
		expect(values(['--force']).force).toBe(true);
	});

	it('reads an option in both syntaxes', () => {
		expect(values(['--out=dist']).out).toBe('dist');
		expect(values(['--out', 'dist']).out).toBe('dist');
	});

	it('coerces a number', () => {
		expect(values(['--quality=90']).quality).toBe(90);
	});

	it('accepts a legitimate zero', () => {
		expect(values(['--quality=0']).quality).toBe(0);
	});

	it('falls back when a number is empty or unparseable', () => {
		expect(values(['--quality=']).quality).toBe(82);
		expect(values(['--quality=nope']).quality).toBe(82);
	});

	it('keeps an explicitly empty option rather than falling back', () => {
		expect(values(['--out=']).out).toBe('');
	});

	it('keeps positionals out of the values', () => {
		const parsed = parse(['sheet', '--force'], options);

		expect(parsed.values.force).toBe(true);
		expect(parsed.positionals).toEqual(['sheet']);
	});

	it('rejects an undeclared option by name', () => {
		expect(() => values(['--nope'])).toThrow(InvalidOption);
		expect(() => values(['--nope'])).toThrow('The "--nope" option does not exist.');
	});

	it('names the undeclared option even when it carries a value', () => {
		expect(() => values(['--nope=1'])).toThrow('The "--nope" option does not exist.');
	});

	it('reports the undeclared option, not an earlier valid one', () => {
		expect(() => values(['--force', '--nope'])).toThrow('The "--nope" option does not exist.');
	});

	it('rejects a value given to a flag', () => {
		expect(() => values(['--force=yes'])).toThrow(InvalidOption);
	});

	it('stops looking past a bare double dash', () => {
		expect(parse(['--', '--nope'], options).positionals).toEqual(['--nope']);
	});
});
