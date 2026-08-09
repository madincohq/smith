import { InvalidArgument } from './exceptions/invalid-argument.js';

export interface Argument<T> {
	readonly kind: 'required' | 'optional' | 'rest';
	readonly fallback: T;
	readonly description: string;
}

export type Arguments = Record<string, Argument<unknown>>;

export function argument(description: string): Argument<string> {
	return { kind: 'required', fallback: '', description };
}

export function optional(fallback: string, description: string): Argument<string> {
	return { kind: 'optional', fallback, description };
}

export function maybe(description: string): Argument<string | undefined> {
	return { kind: 'optional', fallback: undefined, description };
}

export function rest(description: string): Argument<string[]> {
	return { kind: 'rest', fallback: [], description };
}

export function bind(
	positionals: string[],
	declared: Arguments,
	command: string
): Record<string, unknown> {
	const entries = Object.entries(declared);

	check(entries);

	const values: Record<string, unknown> = {};
	const missing: string[] = [];
	let index = 0;

	for (const [name, taken] of entries) {
		if (taken.kind === 'rest') {
			values[name] = positionals.slice(index);
			index = positionals.length;
			continue;
		}

		const given = positionals[index];
		index += 1;

		if (given !== undefined) values[name] = given;
		else if (taken.kind === 'optional') values[name] = taken.fallback;
		else missing.push(name);
	}

	if (missing.length > 0) {
		throw new InvalidArgument(`Not enough arguments (missing: "${missing.join(', ')}").`);
	}

	if (index < positionals.length) throw new InvalidArgument(tooMany(command, entries));

	return values;
}

function tooMany(command: string, entries: [string, Argument<unknown>][]): string {
	if (entries.length === 0) return `No arguments expected for "${command}" command.`;

	const expected = entries.map(([name]) => name).join('" "');

	return `Too many arguments to "${command}" command, expected arguments "${expected}".`;
}

function check(entries: [string, Argument<unknown>][]): void {
	let optional = false;

	entries.forEach(([name, argument], position) => {
		if (argument.kind === 'rest' && position !== entries.length - 1) {
			throw new Error(`The <${name}> argument collects the rest, so it must come last.`);
		}

		if (argument.kind === 'required' && optional) {
			throw new Error(`The <${name}> argument is required, so it cannot follow an optional one.`);
		}

		if (argument.kind !== 'required') optional = true;
	});
}
