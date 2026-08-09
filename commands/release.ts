import { execFileSync } from 'node:child_process';
import { Command, flag, optional } from '@madinco/smith';

const LEVELS = ['patch', 'minor', 'major'];

export class ReleaseCommand extends Command {
	readonly name = 'release';
	readonly description = 'Check, version, publish and push a release';

	readonly arguments = {
		level: optional('patch', 'patch, minor or major'),
	};

	readonly options = {
		dry: flag('Say what would happen and stop'),
		force: flag('Publish without confirming'),
	};

	async handle(): Promise<number> {
		const level = this.argument('level');

		if (!LEVELS.includes(level)) {
			this.error(`"${level}" is not a release level. Use patch, minor or major.`);

			return Command.INVALID;
		}

		if (read('git', ['status', '--porcelain']) !== '') {
			this.error('The working tree has uncommitted changes. Commit them first.');

			return Command.INVALID;
		}

		this.newLine().details('Releasing', [
			{ label: 'From', value: version() },
			{ label: 'Bump', value: level },
			{ label: 'Branch', value: read('git', ['rev-parse', '--abbrev-ref', 'HEAD']) },
		]);

		if (this.option('dry')) {
			this.newLine().comment('Nothing was published. Drop --dry to release.');

			return Command.SUCCESS;
		}

		const confirmed = await this.confirmsPublish(level);

		if (!confirmed) {
			this.comment('Nothing was published.');

			return Command.SUCCESS;
		}

		this.step('Typechecking', 'pnpm', ['run', 'typecheck']);
		this.step('Running the tests', 'pnpm', ['run', 'test:run']);
		this.step('Building', 'pnpm', ['run', 'build']);
		this.step(`Bumping the ${level} version`, 'pnpm', ['version', level]);
		this.step(`Publishing ${version()}`, 'pnpm', ['publish', '--access', 'public']);
		this.step('Pushing', 'git', ['push']);
		this.step('Pushing the tag', 'git', ['push', '--tags']);

		this.newLine().details('Released', [
			{ label: 'Version', value: version(), tone: 'good' },
			{ label: 'Tag', value: `v${version()}` },
		]);

		return Command.SUCCESS;
	}

	private async confirmsPublish(level: string): Promise<boolean> {
		if (this.option('force')) return true;

		return this.confirm(`Publish ${version()} as a ${level} release?`);
	}

	private step(label: string, command: string, args: string[]): void {
		this.newLine().comment(label);

		run(command, args);
	}
}

function run(command: string, args: string[]): void {
	execFileSync(command, args, { stdio: 'inherit' });
}

function version(): string {
	return read('node', ['-p', "require('./package.json').version"]);
}

function read(command: string, args: string[]): string {
	try {
		return execFileSync(command, args, { encoding: 'utf8' }).trim();
	} catch (reason) {
		const failure = reason as { stderr?: string; stdout?: string };

		throw new Error(
			`${command} ${args.join(' ')} failed.\n${failure.stderr ?? ''}${failure.stdout ?? ''}`.trim()
		);
	}
}
