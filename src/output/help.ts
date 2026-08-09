import type { Argument, Arguments } from '../arguments.js';
import type { Option, Options } from '../options.js';
import type { Section } from './terminal.js';

const SILENT = new Set(['flag', 'required', 'rest']);

export interface Described {
	readonly name: string;
	readonly description: string;
	readonly arguments: Arguments;
	readonly options: Options;
}

export function usage(command: Described): Section[] {
	const positional = Object.entries(command.arguments);
	const declared = Object.entries(command.options);

	const sections: Section[] = [
		{ title: 'Description', lines: [command.description] },
		{ title: 'Usage', lines: [invocation(command)] },
	];

	if (positional.length > 0) sections.push({ title: 'Arguments', lines: columns(takes(positional)) });
	if (declared.length > 0) sections.push({ title: 'Options', lines: columns(rows(declared)) });

	return sections;
}

function invocation(command: Described): string {
	const parts = Object.entries(command.arguments).map(([name, taken]) => placeholder(name, taken));

	if (Object.keys(command.options).length > 0) parts.push('[options]');

	return [command.name, ...parts].join(' ');
}

function placeholder(name: string, taken: Argument<unknown>): string {
	if (taken.kind === 'required') return `<${name}>`;
	if (taken.kind === 'rest') return `[${name}...]`;

	return `[${name}]`;
}

function takes(entries: [string, Argument<unknown>][]): [string, string][] {
	return entries.map(([name, taken]) => [name, `${taken.description}${fallback(taken)}`]);
}

export function listing(commands: Described[]): Section[] {
	const sorted = [...commands].sort((one, other) => one.name.localeCompare(other.name));

	return [
		{ title: 'Usage', lines: ['smith <command> [options]'] },
		{
			title: 'Available commands',
			lines: columns(sorted.map((command) => [command.name, command.description])),
		},
	];
}

function rows(declared: [string, Option<unknown>][]): [string, string][] {
	return declared.map(([name, option]) => [
		signature(name, option),
		`${option.description}${fallback(option)}`,
	]);
}

function columns(rows: [string, string][]): string[] {
	const width = Math.max(0, ...rows.map(([left]) => left.length));

	return rows.map(([left, right]) => `${left.padEnd(width)}  ${right}`);
}

function signature(name: string, option: Option<unknown>): string {
	const alias = option.short ? `-${option.short}, ` : '';

	return option.kind === 'flag'
		? `${alias}--${name}`
		: `${alias}--${name}[=${name.toUpperCase()}]`;
}

function fallback(declared: Option<unknown> | Argument<unknown>): string {
	const shown = declared.fallback !== '' && declared.fallback !== undefined;

	if (!shown || SILENT.has(declared.kind)) return '';

	return ` [default: ${JSON.stringify(declared.fallback)}]`;
}
