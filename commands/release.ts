import { execFileSync } from 'node:child_process';
import { Command, Directory, flag, optional, Transaction } from '../src/index.js';

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

		if (this.project === null) {
			this.error('Run this command inside a project with a package.json.');
			return Command.INVALID;
		}

		if (this.read('git', ['status', '--porcelain']) !== '') {
			this.error('The working tree has uncommitted changes. Commit them first.');
			return Command.INVALID;
		}

		const from = this.version();
		const to = next(from, level);
		const tag = `v${to}`;

		if (this.read('git', ['tag', '--list', tag]) !== '') {
			this.error(`The tag ${tag} already exists. Remove it before releasing.`);
			return Command.INVALID;
		}

		this.newLine().details('Releasing', [
			{ label: 'Bump', value: level },
			{ label: 'From', value: from },
			{ label: 'To', value: to, tone: 'good' },
			{ label: 'Branch', value: this.read('git', ['rev-parse', '--abbrev-ref', 'HEAD']) },
		]);

		if (this.option('dry')) {
			this.newLine().comment('Nothing was published. Drop --dry to release.');
			return Command.SUCCESS;
		}

		if (!this.option('force') && !await this.confirm(`Publish ${to}?`)) {
			this.comment('Nothing was published.');
			return Command.SUCCESS;
		}

		this.ensureNpmLogin();

		const originalHead = this.read('git', ['rev-parse', 'HEAD']);

		this.step('Typechecking', 'pnpm', ['run', 'typecheck']);
		this.step('Running the tests', 'pnpm', ['run', 'test:run']);
		this.step('Building', 'pnpm', ['run', 'build']);

		await new Transaction().run([
			{
				up: () => this.step(`Bumping the ${level} version`, 'pnpm', ['version', level]),
				down: () => this.restore(tag, originalHead),
			},
			{
				up: () => this.step(`Publishing ${to}`, 'pnpm', ['publish', '--access', 'public']),
			},
		]);

		this.step('Pushing', 'git', ['push']);
		this.step('Pushing the tag', 'git', ['push', '--tags']);

		this.newLine().details('Released', [
			{ label: 'Version', value: to, tone: 'good' },
			{ label: 'Tag', value: tag },
		]);

		return Command.SUCCESS;
	}

	private ensureNpmLogin(): void {
		if (this.isLoggedIn()) return;

		this.step('Logging in to npm', 'npm', ['login']);

		if (!this.isLoggedIn()) {
			throw new Error('npm login did not establish an authenticated session.');
		}
	}

	private isLoggedIn(): boolean {
		try {
			return this.read('npm', ['whoami']) !== '';
		} catch {
			return false;
		}
	}

	private restore(tag: string, originalHead: string): void {
		const failures: unknown[] = [];

		try {
			if (this.read('git', ['tag', '--list', tag]) !== '') {
				this.step(`Removing ${tag}`, 'git', ['tag', '--delete', tag]);
			}
		} catch (reason) {
			failures.push(reason);
		}

		try {
			this.step('Restoring the previous commit', 'git', ['reset', '--hard', originalHead]);
		} catch (reason) {
			failures.push(reason);
		}

		if (failures.length > 0) throw new AggregateError(failures, 'Could not restore the release commit and tag');
	}

	private step(label: string, command: string, args: string[]): void {
		this.newLine().comment(label);
		this.runCommand(command, args);
	}

	protected runCommand(command: string, args: string[]): void {
		execFileSync(command, args, { cwd: this.project ?? this.cwd, stdio: 'inherit' });
	}

	protected read(command: string, args: string[]): string {
		try {
			return execFileSync(command, args, { cwd: this.project ?? this.cwd, encoding: 'utf8' }).trim();
		} catch (reason) {
			const failure = reason as { stderr?: string; stdout?: string };

			throw new Error(
				`${command} ${args.join(' ')} failed.\n${failure.stderr ?? ''}${failure.stdout ?? ''}`.trim()
			);
		}
	}

	private version(): string {
		const manifest = new Directory(this.project ?? this.cwd).file('package.json');

		return (JSON.parse(manifest.read()) as { version: string }).version;
	}
}

function next(current: string, level: string): string {
	const [major = 0, minor = 0, patch = 0] = current.split('.').map(Number);

	if (level === 'major') return `${major + 1}.0.0`;
	if (level === 'minor') return `${major}.${minor + 1}.0`;

	return `${major}.${minor}.${patch + 1}`;
}
