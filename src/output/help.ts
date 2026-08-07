import type { Option, Options } from '../options.js';
import type { Section } from './terminal.js';

export interface Described {
	readonly name: string;
	readonly description: string;
	readonly options: Options;
}

export function usage(command: Described): Section[] {
	const declared = Object.entries(command.options);

	const sections: Section[] = [
		{ title: 'Description', lines: [command.description] },
		{ title: 'Usage', lines: [`${command.name}${declared.length > 0 ? ' [options]' : ''}`] },
	];

	if (declared.length > 0) sections.push({ title: 'Options', lines: columns(rows(declared)) });

	return sections;
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

function fallback(option: Option<unknown>): string {
	if (option.kind === 'flag' || option.fallback === '') return '';

	return ` [default: ${JSON.stringify(option.fallback)}]`;
}
