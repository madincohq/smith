import { detached, type Context } from './context.js';
import { bind, type Arguments } from './arguments.js';
import { parse, type Options, type Value } from './options.js';
import { Terminal, type Section } from './output/terminal.js';
import type { Detail } from './output/detail.js';
import type { Spinner } from './output/spinner.js';
import type { ProgressBar } from './output/progress.js';

export const COMMAND: unique symbol = Symbol.for('smith.command');

export abstract class Command {
	static readonly [COMMAND] = true;

	static readonly SUCCESS = 0;
	static readonly FAILURE = 1;
	static readonly INVALID = 2;

	abstract readonly name: string;
	abstract readonly description: string;

	readonly arguments: Arguments = {};
	readonly options: Options = {};

	private terminal = Terminal.silent();
	private context = detached();
	private values: Record<string, unknown> = {};
	private taken: Record<string, unknown> = {};

	abstract handle(): Promise<number> | number;

	async run(terminal: Terminal, argv: string[], context: Context = detached()): Promise<number> {
		const parsed = parse(argv, this.options);

		this.terminal = terminal;
		this.context = context;
		this.values = parsed.values;
		this.taken = bind(parsed.positionals, this.arguments, this.name);

		return this.handle();
	}

	get cwd(): string {
		return this.context.cwd;
	}

	get project(): string | null {
		return this.context.project;
	}

	option<K extends keyof this['options']>(key: K): Value<this['options'][K]> {
		return this.values[key as string] as Value<this['options'][K]>;
	}

	argument<K extends keyof this['arguments']>(key: K): Value<this['arguments'][K]> {
		return this.taken[key as string] as Value<this['arguments'][K]>;
	}

	line(text?: string): this {
		this.terminal.line(text);
		return this;
	}

	info(text?: string): this {
		this.terminal.info(text);
		return this;
	}

	comment(text?: string): this {
		this.terminal.comment(text);
		return this;
	}

	warn(text?: string): this {
		this.terminal.warn(text);
		return this;
	}

	error(text?: string): this {
		this.terminal.error(text);
		return this;
	}

	newLine(count?: number): this {
		this.terminal.newLine(count);
		return this;
	}

	/**
	 * Write a label and a value, separated by a dotted leader.
	 */
	detail(label: string, value: string): this {
		this.terminal.detail(label, value);
		return this;
	}

	/**
	 * Write a heading with its own leader, over indented rows.
	 */
	details(heading: string, rows: Detail[]): this {
		this.terminal.details(heading, rows);
		return this;
	}

	sections(sections: Section[]): this {
		this.terminal.sections(sections);
		return this;
	}

	progress(total: number): ProgressBar {
		return this.terminal.progress(total);
	}

	spinner(): Spinner {
		return this.terminal.spinner();
	}

	spin<T>(label: string, task: () => Promise<T> | T): Promise<T> {
		return this.terminal.spin(label, task);
	}
}
