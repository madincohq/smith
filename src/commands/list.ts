import { Command } from '../command.js';
import { listing } from '../output/help.js';

export class ListCommand extends Command {
	readonly name = 'list';
	readonly description = 'List the available commands';

	constructor(private readonly registry: Map<string, Command>) {
		super();
	}

	handle(): number {
		this.sections(listing([...this.registry.values()]));

		return Command.SUCCESS;
	}
}
