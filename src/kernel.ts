import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMMAND, Command } from './command.js';
import { AboutCommand } from './commands/about.js';
import { HelpCommand } from './commands/help.js';
import { ListCommand } from './commands/list.js';
import { detached, type Context } from './context.js';
import { renders } from './exceptions/renders.js';
import { Terminal } from './output/terminal.js';

const ASKING = ['--help', '-h'];
const SOURCE = /(?<!\.d)\.ts$|\.js$/;
const IGNORED = /^[._]/;

type Constructor = new () => Command;

interface Skip {
	readonly path: string;
	readonly reason?: string;
}

export class Kernel {
	private readonly commands = new Map<string, Command>();

	constructor(
		private readonly terminal: Terminal,
		private readonly context: Context
	) {}

	static make(terminal: Terminal = Terminal.standard(), context: Context = detached()): Kernel {
		const kernel = new Kernel(terminal, context);

		return kernel
			.add(new ListCommand(kernel.commands))
			.add(new HelpCommand(kernel.commands))
			.add(new AboutCommand());
	}

	add(command: Command): this {
		this.commands.set(command.name, command);
		return this;
	}

	async discover(directory: string): Promise<this> {
		const skipped: Skip[] = [];

		await this.walk(directory, skipped);
		this.summarise(directory, skipped);

		return this;
	}

	private async walk(directory: string, skipped: Skip[]): Promise<void> {
		if (!existsSync(directory)) return;

		const entries = readdirSync(directory, { withFileTypes: true }).sort((one, other) =>
			one.name.localeCompare(other.name)
		);

		for (const entry of entries) {
			const path = join(directory, entry.name);

			if (IGNORED.test(entry.name)) continue;
			else if (entry.isDirectory()) await this.walk(path, skipped);
			else if (SOURCE.test(entry.name) && !entry.name.includes('.test.')) {
				await this.load(path, skipped);
			}
		}
	}

	private async load(path: string, skipped: Skip[]): Promise<void> {
		let found = false;

		try {
			const module: Record<string, unknown> = await import(pathToFileURL(path).href);

			for (const exported of candidates(module)) {
				if (!constructs(exported)) continue;

				const command = new exported();

				if (!command.name) continue;

				this.add(command);
				found = true;
			}
		} catch (reason) {
			skipped.push({ path, reason: reason instanceof Error ? reason.message : String(reason) });

			return;
		}

		if (!found) skipped.push({ path });
	}

	private summarise(directory: string, skipped: Skip[]): void {
		for (const { path, reason } of skipped) {
			if (reason !== undefined) this.terminal.warn(`Skipped ${path}: ${reason}`);
		}

		const quiet = skipped.filter((skip) => skip.reason === undefined);
		const [only] = quiet;

		if (quiet.length === 1 && only) {
			this.terminal.warn(`Skipped ${only.path}: no command class exported.`);
		} else if (quiet.length > 1) {
			this.terminal.warn(
				`Skipped ${quiet.length} files in ${this.shorten(directory)}: no command class exported.`
			);
		}
	}

	private shorten(directory: string): string {
		const short = relative(this.context.cwd, directory);

		return short && !short.startsWith('..') ? short : directory;
	}

	async handle(argv: string[]): Promise<number> {
		const [name = 'list', ...rest] = argv;

		if (ASKING.includes(name)) return this.handle(['list']);
		if (rest.some((argument) => ASKING.includes(argument))) return this.handle(['help', name]);

		const command = this.commands.get(name);

		if (!command) {
			this.terminal.error(`Unknown command "${name}".`).newLine();
			await this.handle(['list']);

			return Command.INVALID;
		}

		try {
			return await command.run(this.terminal, rest, this.context);
		} catch (reason) {
			return this.report(reason, command);
		}
	}

	private report(reason: unknown, command: Command): number {
		if (renders(reason)) {
			this.terminal.error(reason.message).newLine().sections(reason.render(command));

			return Command.INVALID;
		}

		this.terminal.error(
			`${command.name} failed: ${reason instanceof Error ? reason.message : String(reason)}`
		);

		if (process.env.SMITH_DEBUG && reason instanceof Error && reason.stack) {
			this.terminal.error(reason.stack);
		}

		return Command.FAILURE;
	}
}

function candidates(module: Record<string, unknown>): unknown[] {
	const exported = Object.values(module);

	return [...exported, ...exported.filter(grouped).flatMap((value) => Object.values(value))];
}

function grouped(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function constructs(exported: unknown): exported is Constructor {
	return typeof exported === 'function' && COMMAND in exported;
}
