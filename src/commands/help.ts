import { Command } from '../command.js';
import { maybe } from '../arguments.js';
import { listing, usage } from '../output/help.js';

export class HelpCommand extends Command {
	readonly name = 'help';
	readonly description = 'Show help for a command';

	readonly arguments = {
		command: maybe('Command to describe, or nothing for the full list'),
	};

	constructor(private readonly registry: Map<string, Command>) {
		super();
	}

	handle(): number {
		const name = this.argument('command');

		if (name === undefined) {
			this.sections(listing([...this.registry.values()]));
			return Command.SUCCESS;
		}

		const command = this.registry.get(name);

		if (!command) {
			this.error(`Unknown command "${name}".`);
			return Command.INVALID;
		}

		this.sections(usage(command));

		return Command.SUCCESS;
	}
}
