import { describe, expect, it } from 'vitest';
import { listing, usage, type Described } from '@/output/help';
import { argument, maybe, optional, rest } from '@/arguments';
import { flag, number, option } from '@/options';

const greet: Described = {
	name: 'greet',
	description: 'Say hello',
	arguments: {},
	options: {
		name: option('world', 'Who to greet'),
		times: number(1, 'How many times'),
		locale: option('', 'Limit to a single locale'),
		loud: flag('Shout it'),
	},
};

const bare: Described = { name: 'bare', description: 'Takes nothing', arguments: {}, options: {} };

function section(command: Described, title: string): string[] {
	return usage(command).find((found) => found.title === title)?.lines ?? [];
}

const move: Described = {
	name: 'move',
	description: 'Move a page',
	arguments: {
		from: argument('Path to move'),
		to: optional('archive', 'Where it should live'),
		extras: rest('Anything else to carry along'),
	},
	options: {},
};

describe('arguments', () => {
	it('spells a required argument as angle brackets', () => {
		expect(section(move, 'Usage')).toEqual(['move <from> [to] [extras...]']);
	});

	it('omits the arguments section for a command that takes none', () => {
		expect(usage(bare).map((found) => found.title)).toEqual(['Description', 'Usage']);
	});

	it('lists each argument with its description', () => {
		expect(section(move, 'Arguments')[0]).toContain('from');
		expect(section(move, 'Arguments')[0]).toContain('Path to move');
	});

	it('shows a default only where one was declared', () => {
		const lines = section(move, 'Arguments').join('\n');

		expect(lines).toContain('[default: "archive"]');
		expect(lines).not.toContain('[default: ""]');
		expect(lines).not.toContain('[default: []]');
	});

	it('shows no default for an optional argument that has none', () => {
		const described: Described = {
			name: 'help',
			description: 'Show help',
			arguments: { command: maybe('Command to describe') },
			options: {},
		};

		expect(section(described, 'Arguments').join('')).not.toContain('default');
	});

	it('puts arguments before options', () => {
		const described: Described = { ...move, options: greet.options };

		expect(usage(described).map((found) => found.title)).toEqual([
			'Description',
			'Usage',
			'Arguments',
			'Options',
		]);
	});
});

describe('usage', () => {
	it('opens with the description', () => {
		expect(section(greet, 'Description')).toEqual(['Say hello']);
	});

	it('marks a command that accepts options', () => {
		expect(section(greet, 'Usage')).toEqual(['greet [options]']);
	});

	it('omits the options section for a command without any', () => {
		expect(section(bare, 'Usage')).toEqual(['bare']);
		expect(usage(bare).map((found) => found.title)).toEqual(['Description', 'Usage']);
	});

	it('renders a flag without a value placeholder', () => {
		expect(section(greet, 'Options')).toContainEqual(expect.stringContaining('--loud '));
		expect(section(greet, 'Options').join('')).not.toContain('--loud[=');
	});

	it('renders a value option with an upper-case placeholder', () => {
		expect(section(greet, 'Options')[0]).toContain('--name[=NAME]');
	});

	it('shows defaults for options but not for flags', () => {
		const lines = section(greet, 'Options');

		expect(lines[0]).toContain('[default: "world"]');
		expect(lines[1]).toContain('[default: 1]');
		expect(lines[3]).not.toContain('default');
	});

	it('hides an empty string default', () => {
		expect(section(greet, 'Options')[2]).toBe('--locale[=LOCALE]  Limit to a single locale');
	});

	it('aligns the descriptions in one column', () => {
		const lines = section(greet, 'Options');

		const starts = [
			lines[0].indexOf('Who to greet'),
			lines[1].indexOf('How many times'),
			lines[2].indexOf('Limit to a single locale'),
			lines[3].indexOf('Shout it'),
		];

		expect(new Set(starts)).toEqual(new Set([starts[0]]));
	});
});

describe('listing', () => {
	it('sorts the commands by name', () => {
		const lines = listing([greet, bare]).find((found) => found.title === 'Available commands');

		expect(lines?.lines[0]).toContain('bare');
		expect(lines?.lines[1]).toContain('greet');
	});

	it('shows how to invoke the binary', () => {
		expect(listing([greet])[0]).toEqual({ title: 'Usage', lines: ['smith <command> [options]'] });
	});
});
