import { Command } from '../command.js';
import { listing, usage } from '../output/help.js';

export class HelpCommand extends Command {
	readonly name = 'help';
	readonly description = 'Show help for a command';

	constructor(private readonly registry: Map<string, Command>) {
		super();
	}

	handle(): number {
		const name = this.argument();

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
