import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Command, argument } from '@madinco/smith';

export class CheckCommand extends Command {
	readonly name = 'check';
	readonly description = 'Report whether a file exists, failing when it does not';

	readonly arguments = {
		file: argument('File that must exist'),
	};

	handle(): number {
		const file = this.argument('file');

		if (!existsSync(join(this.cwd, file))) {
			this.error(`${file} is missing.`);

			return Command.FAILURE;
		}

		this.line(file);

		return Command.SUCCESS;
	}
}
