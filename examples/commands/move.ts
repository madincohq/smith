import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Command, argument, flag } from '@madinco/smith';

export class MoveCommand extends Command {
	readonly name = 'move';
	readonly description = 'Move a file, creating the destination directory if needed';

	readonly arguments = {
		from: argument('Path to move'),
		to: argument('Where it should end up'),
	};

	readonly options = {
		force: flag('Overwrite the destination if it already exists'),
	};

	handle(): number {
		const from = this.argument('from');
		const to = this.argument('to');
		const source = resolve(this.cwd, from);
		const target = resolve(this.cwd, to);

		if (!existsSync(source)) {
			this.error(`${from} does not exist.`);

			return Command.INVALID;
		}

		if (existsSync(target) && !this.option('force')) {
			this.error(`${to} already exists. Pass --force to overwrite it.`);

			return Command.INVALID;
		}

		mkdirSync(dirname(target), { recursive: true });
		renameSync(source, target);

		this.info(`Moved ${from} to ${to}`);

		return Command.SUCCESS;
	}
}
