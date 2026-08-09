import { describe, expect, it } from 'vitest';
import { argument, bind, maybe, optional, rest } from '@/arguments';
import { InvalidArgument } from '@/exceptions/invalid-argument';

describe('bind', () => {
	it('binds positionals to names in the order they were declared', () => {
		const declared = { from: argument('Where from'), to: argument('Where to') };

		expect(bind(['old.md', 'new.md'], declared, 'make:command')).toEqual({ from: 'old.md', to: 'new.md' });
	});

	it('binds nothing when nothing is declared', () => {
		expect(bind([], {}, 'list')).toEqual({});
	});

	it('refuses a missing required argument', () => {
		const declared = { name: argument('Name of the command') };

		expect(() => bind([], declared, 'make:command')).toThrow(InvalidArgument);
	});

	it('names the argument it is missing', () => {
		const declared = { name: argument('Name of the command') };

		expect(() => bind([], declared, 'make:command')).toThrow(
			'Not enough arguments (missing: "name").'
		);
	});

	it('names every argument it is missing at once', () => {
		const declared = { from: argument('Where from'), to: argument('Where to') };

		expect(() => bind([], declared, 'move')).toThrow(
			'Not enough arguments (missing: "from, to").'
		);
	});

	it('falls back to the declared default', () => {
		const declared = { branch: optional('main', 'Branch to ship') };

		expect(bind([], declared, 'make:command')).toEqual({ branch: 'main' });
	});

	it('prefers what was given over the default', () => {
		const declared = { branch: optional('main', 'Branch to ship') };

		expect(bind(['topic'], declared, 'make:command')).toEqual({ branch: 'topic' });
	});

	it('leaves an absent optional undefined when it has no default', () => {
		const declared = { command: maybe('Command to describe') };

		expect(bind([], declared, 'make:command')).toEqual({ command: undefined });
	});

	it('collects the remainder into a rest argument', () => {
		const declared = { files: rest('Images to recompress') };

		expect(bind(['a.png', 'b.png'], declared, 'make:command')).toEqual({ files: ['a.png', 'b.png'] });
	});

	it('collects an empty rest rather than failing', () => {
		const declared = { files: rest('Images to recompress') };

		expect(bind([], declared, 'make:command')).toEqual({ files: [] });
	});

	it('fills the named arguments before the rest collects anything', () => {
		const declared = { script: argument('Script to run'), args: rest('Arguments to forward') };

		expect(bind(['build', '--watch', '-v'], declared, 'make:command')).toEqual({
			script: 'build',
			args: ['--watch', '-v'],
		});
	});

	it('refuses an argument it was not expecting', () => {
		const declared = { name: argument('Name of the command') };

		expect(() => bind(['one', 'two'], declared, 'make:command')).toThrow(InvalidArgument);
	});

	it('says which command it was and what that command takes', () => {
		const declared = { name: argument('Name of the command') };

		expect(() => bind(['one', 'two'], declared, 'make:command')).toThrow(
			'Too many arguments to "make:command" command, expected arguments "name".'
		);
	});

	it('lists every expected argument when there is more than one', () => {
		const declared = { from: argument('Where from'), to: argument('Where to') };

		expect(() => bind(['a', 'b', 'c'], declared, 'move')).toThrow(
			'Too many arguments to "move" command, expected arguments "from" "to".'
		);
	});

	it('says plainly when a command takes no arguments at all', () => {
		expect(() => bind(['foo'], {}, 'list')).toThrow('No arguments expected for "list" command.');
	});
});

describe('declarations', () => {
	it('refuses a rest argument that is not last', () => {
		const declared = { files: rest('Files'), name: argument('Name') };

		expect(() => bind([], declared, 'make:command')).toThrow('must come last');
	});

	it('refuses a second rest argument', () => {
		const declared = { files: rest('Files'), more: rest('More') };

		expect(() => bind([], declared, 'make:command')).toThrow('must come last');
	});

	it('refuses a required argument after an optional one', () => {
		const declared = { branch: optional('main', 'Branch'), name: argument('Name') };

		expect(() => bind([], declared, 'make:command')).toThrow('cannot follow');
	});

	it('reports a bad declaration as a programming error, not a user one', () => {
		const declared = { files: rest('Files'), name: argument('Name') };

		expect(() => bind([], declared, 'make:command')).not.toThrow(InvalidArgument);
	});
});
