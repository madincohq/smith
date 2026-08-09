import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Command, type Detail } from '@madinco/smith';

export class HealthCommand extends Command {
	readonly name = 'health';
	readonly description = 'Check the project for the files it expects';

	handle(): number {
		this.newLine().details('Runtime', [
			{ label: 'Node', value: process.version },
			{ label: 'Platform', value: process.platform },
		]);

		this.newLine().details('Project', this.project === null ? [] : checks(this.project));

		return Command.SUCCESS;
	}
}

function checks(root: string): Detail[] {
	return [
		found(root, 'package.json'),
		found(root, '.gitignore'),
		found(root, '.env'),
	];
}

function found(root: string, file: string): Detail {
	const there = existsSync(join(root, file));

	return { label: file, value: there ? 'FOUND' : 'MISSING', tone: there ? 'good' : 'warn' };
}
