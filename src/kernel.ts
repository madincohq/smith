import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from './command.js';
import { HelpCommand } from './commands/help.js';
import { ListCommand } from './commands/list.js';
import { detached, type Context } from './context.js';
import { usage } from './output/help.js';
import { InvalidOption } from './options.js';
import { Terminal } from './output/terminal.js';

const ASKING = ['--help', '-h'];
const SOURCE = /(?<!\.d)\.ts$|\.js$/;
const IGNORED = /^[._]/;

type Constructor = new () => Command;

export class Kernel {
	private readonly commands = new Map<string, Command>();

	constructor(
		private readonly terminal: Terminal,
		private readonly context: Context
	) {}

	static make(terminal: Terminal = Terminal.standard(), context: Context = detached()): Kernel {
		const kernel = new Kernel(terminal, context);

		return kernel.add(new ListCommand(kernel.commands)).add(new HelpCommand(kernel.commands));
	}

	add(command: Command): this {
		this.commands.set(command.name, command);
		return this;
	}

	async discover(directory: string): Promise<this> {
		if (!existsSync(directory)) return this;

		const entries = readdirSync(directory, { withFileTypes: true }).sort((one, other) =>
			one.name.localeCompare(other.name)
		);

		for (const entry of entries) {
			const path = join(directory, entry.name);

			if (IGNORED.test(entry.name)) continue;
			else if (entry.isDirectory()) await this.discover(path);
			else if (SOURCE.test(entry.name) && !entry.name.includes('.test.')) await this.load(path);
		}

		return this;
	}

	private async load(path: string): Promise<void> {
		let found = false;

		try {
			const module: Record<string, unknown> = await import(pathToFileURL(path).href);

			for (const exported of Object.values(module)) {
				if (!constructs(exported)) continue;

				const command = new exported();

				if (!command.name) continue;

				this.add(command);
				found = true;
			}
		} catch (reason) {
			this.terminal.warn(
				`Skipped ${path}: ${reason instanceof Error ? reason.message : String(reason)}`
			);

			return;
		}

		if (!found) this.terminal.warn(`Skipped ${path}: it exports no named command.`);
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
		if (reason instanceof InvalidOption) {
			this.terminal.error(reason.message).newLine().sections(usage(command));
			return Command.INVALID;
		}

		this.terminal.error(reason instanceof Error ? reason.message : String(reason));

		return Command.FAILURE;
	}
}

function constructs(exported: unknown): exported is Constructor {
	return typeof exported === 'function' && exported.prototype instanceof Command;
}
