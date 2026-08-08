import { parseArgs, type ParseArgsConfig } from 'node:util';
import { InvalidOption } from './exceptions/invalid-option.js';

export interface Option<T> {
	readonly kind: 'flag' | 'option' | 'number';
	readonly fallback: T;
	readonly description: string;
	readonly short?: string;
}

export type Options = Record<string, Option<unknown>>;

export type Value<O> = O extends Option<infer T> ? T : never;

export type Values<O extends Options> = { [K in keyof O]: Value<O[K]> };

export interface Parsed<O extends Options> {
	values: Values<O>;
	positionals: string[];
}

export { InvalidOption };

export function flag(description: string, short?: string): Option<boolean> {
	return { kind: 'flag', fallback: false, description, short };
}

export function option(fallback: string, description: string, short?: string): Option<string> {
	return { kind: 'option', fallback, description, short };
}

export function number(fallback: number, description: string, short?: string): Option<number> {
	return { kind: 'number', fallback, description, short };
}

export function parse<O extends Options>(argv: string[], options: O): Parsed<O> {
	const { values, positionals } = read(argv, options);

	const entries = Object.entries(options).map(([name, declared]) => [
		name,
		coerce(declared, values[name]),
	]);

	return { values: Object.fromEntries(entries) as Values<O>, positionals };
}

function read(argv: string[], options: Options) {
	try {
		return parseArgs({ args: argv, options: config(options), allowPositionals: true });
	} catch (reason) {
		throw rephrase(reason, argv, options);
	}
}

function rephrase(reason: unknown, argv: string[], options: Options): unknown {
	if (!code(reason).startsWith('ERR_PARSE_ARGS')) return reason;

	const unknown = undeclared(argv, options);
	const message = reason instanceof Error ? reason.message : String(reason);

	return new InvalidOption(unknown ? `The "${unknown}" option does not exist.` : message);
}

function code(reason: unknown): string {
	return reason instanceof Error && 'code' in reason ? String(reason.code) : '';
}

function undeclared(argv: string[], options: Options): string | undefined {
	const declared = new Set(Object.entries(options).flatMap(([name, o]) => [name, o.short ?? name]));

	for (const token of argv) {
		if (token === '--') break;
		if (!token.startsWith('-')) continue;

		const [flagged = ''] = token.split('=');
		if (!declared.has(flagged.replace(/^--?/, ''))) return flagged;
	}

	return undefined;
}

function config(options: Options): NonNullable<ParseArgsConfig['options']> {
	const entries = Object.entries(options).map(([name, declared]) => [
		name,
		{ type: declared.kind === 'flag' ? 'boolean' : 'string', ...(declared.short && { short: declared.short }) },
	]);

	return Object.fromEntries(entries) as NonNullable<ParseArgsConfig['options']>;
}

function coerce(declared: Option<unknown>, raw: unknown): unknown {
	if (declared.kind === 'flag') return raw === true;
	if (typeof raw !== 'string') return declared.fallback;
	if (declared.kind === 'option') return raw;

	const value = Number(raw);
	return raw !== '' && Number.isFinite(value) ? value : declared.fallback;
}
