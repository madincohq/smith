import { join } from 'node:path';
import { Command } from '../command.js';
import { argument } from '../arguments.js';
import { Files } from '../utils/files.js';
import { flag, option } from '../options.js';
import { Stubs } from '../utils/stubs.js';

const NAME = /^[a-z0-9]+(?:[:-][a-z0-9]+)*$/;

export class MakeCommand extends Command {
	readonly name = 'make:command';
	readonly description = 'Create a new command class';

	readonly arguments = {
		name: argument('Name of the command, as in cache:clear'),
	};

	readonly options = {
		description: option('Command description', 'Description of the generated command'),
		force: flag('Overwrite the file if it already exists'),
	};

	constructor(private readonly directory: string) {
		super();
	}

	handle(): number {
		const name = this.argument('name');

		if (!NAME.test(name)) {
			this.error(`"${name}" is not a valid command name. Use lower-case words separated by : or -.`);
			return Command.INVALID;
		}

		const file = {
			path: join(this.directory, `${filename(name)}.ts`),
			contents: Stubs.render(Stubs.read('command'), {
				class: classname(name),
				name,
				description: this.option('description'),
			}),
		};

		if (Files.existing([file]).length > 0 && !this.option('force')) {
			this.error(`${file.path} already exists. Pass --force to overwrite it.`);
			return Command.INVALID;
		}

		Files.write([file]);

		this.info(`Created ${file.path}`);

		return Command.SUCCESS;
	}
}

function filename(name: string): string {
	return name.replaceAll(':', '-');
}

function classname(name: string): string {
	const parts = name.split(/[:-]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1));

	return `${parts.join('')}Command`;
}
