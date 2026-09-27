import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command, Terminal, type Context } from '@';
import { ReleaseCommand } from '@commands/release';

const execute = vi.fn((_command: string, _args: string[]): string => '');

class TestReleaseCommand extends ReleaseCommand {
	protected override read(command: string, args: string[]): string {
		return execute(command, args);
	}

	protected override runCommand(command: string, args: string[]): void {
		execute(command, args);
	}
}

let currentVersion: string;
let head: string;
let tagExists: boolean;
let dirty: boolean;
let authenticated: boolean;
let loginAuthenticates: boolean;
let failing: string[];

beforeEach(() => {
	currentVersion = '0.1.0';
	head = 'original-head';
	tagExists = false;
	dirty = false;
	authenticated = true;
	loginAuthenticates = true;
	failing = [];
	execute.mockReset();
	execute.mockImplementation((command, args) => {
		const call = `${command} ${args.join(' ')}`;

		if (call === 'git status --porcelain') return dirty ? ' M package.json' : '';
		if (call === 'git rev-parse --abbrev-ref HEAD') return 'main';
		if (call === 'git rev-parse HEAD') return head;
		if (call === 'git tag --list v0.2.0') return tagExists ? 'v0.2.0' : '';
		if (command === 'node') return currentVersion;
		if (call === 'npm whoami') {
			if (!authenticated) throw new Error('npm whoami failed');
			return 'publisher';
		}

		if (call === 'pnpm version minor') {
			currentVersion = '0.2.0';
			head = 'release-head';
			tagExists = true;
		}

		if (failing.includes(call)) throw new Error(`${call} failed`);

		if (call === 'npm login') authenticated = loginAuthenticates;
		if (call === 'git tag --delete v0.2.0') tagExists = false;
		if (call === 'git reset --hard original-head') {
			currentVersion = '0.1.0';
			head = 'original-head';
		}

		return '';
	});
});

describe('release', () => {
	it('publishes before pushing the release commit and tag', async () => {
		await expect(WhenReleasing()).resolves.toBe(Command.SUCCESS);

		const commands = calls().filter((call) => call.startsWith('npm ') || call.startsWith('pnpm ') || call.startsWith('git push'));
		expect(commands).toEqual([
			'npm whoami',
			'pnpm run typecheck',
			'pnpm run test:run',
			'pnpm run build',
			'pnpm version minor',
			'pnpm publish --access public',
			'git push',
			'git push --tags',
		]);
		expect(calls()).not.toContain('git reset --hard original-head');
	});

	it('does not run release steps during a dry run', async () => {
		await expect(WhenReleasing({ args: ['minor', '--dry'] })).resolves.toBe(Command.SUCCESS);

		expect(calls().some((call) => call.startsWith('pnpm '))).toBe(false);
		expect(calls()).not.toContain('npm whoami');
		expect(calls()).not.toContain('npm login');
		expect(calls()).not.toContain('git push');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('does not release when confirmation is declined', async () => {
		await expect(WhenReleasing({ args: ['minor'], answer: 'n' })).resolves.toBe(Command.SUCCESS);

		expect(calls().some((call) => call.startsWith('pnpm '))).toBe(false);
		expect(calls()).not.toContain('npm whoami');
		expect(calls()).not.toContain('npm login');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('publishes once confirmation is accepted', async () => {
		await expect(WhenReleasing({ args: ['minor'], answer: 'y' })).resolves.toBe(Command.SUCCESS);

		expect(calls()).toContain('pnpm publish --access public');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.2.0', head: 'release-head', tagExists: true,
		});
	});

	it('rejects an unsupported release level before changing state', async () => {
		await expect(WhenReleasing({ args: ['other', '--force'] })).resolves.toBe(Command.INVALID);

		expect(calls()).toEqual([]);
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('rejects running outside a project before changing state', async () => {
		await expect(WhenReleasing({ project: null })).resolves.toBe(Command.INVALID);

		expect(calls()).toEqual([]);
	});

	it('rejects a dirty working tree before changing state', async () => {
		GivenDirtyWorkingTree();

		await expect(WhenReleasing()).resolves.toBe(Command.INVALID);

		expect(calls()).toEqual(['git status --porcelain']);
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('does not bump the version when a check fails', async () => {
		GivenFailingCommand('pnpm run test:run');

		await expect(WhenReleasing()).rejects.toThrow('pnpm run test:run failed');

		expect(calls()).not.toContain('pnpm version minor');
		expect(calls()).not.toContain('pnpm publish --access public');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('stops when npm login does not establish a session', async () => {
		GivenNoNpmSession({ loginAuthenticates: false });

		await expect(WhenReleasing()).rejects.toThrow('npm login did not establish an authenticated session');

		expect(calls().filter((call) => call.startsWith('npm '))).toEqual([
			'npm whoami', 'npm login', 'npm whoami',
		]);
		expect(calls()).not.toContain('pnpm run typecheck');
		expect(calls()).not.toContain('pnpm version minor');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('logs in before releasing when npm has no active session', async () => {
		GivenNoNpmSession();

		await expect(WhenReleasing()).resolves.toBe(Command.SUCCESS);

		const commands = calls();
		expect(commands.filter((call) => call === 'npm whoami' || call === 'npm login')).toEqual([
			'npm whoami', 'npm login', 'npm whoami',
		]);
		expect(commands.indexOf('npm login')).toBeLessThan(commands.indexOf('pnpm version minor'));
		expect(authenticated).toBe(true);
	});

	it('leaves the version unchanged when npm login fails', async () => {
		GivenNoNpmSession();
		GivenFailingCommand('npm login');

		await expect(WhenReleasing()).rejects.toThrow('npm login failed');

		expect(calls()).not.toContain('pnpm run typecheck');
		expect(calls()).not.toContain('pnpm version minor');
		expect(calls()).not.toContain('pnpm publish --access public');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('removes the new tag and commit when publishing fails', async () => {
		GivenFailingCommand('pnpm publish --access public');

		await expect(WhenReleasing()).rejects.toThrow('pnpm publish --access public failed');

		expect(calls().slice(-3)).toEqual([
			'git tag --list v0.2.0',
			'git tag --delete v0.2.0',
			'git reset --hard original-head',
		]);
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
		expect(calls()).not.toContain('git push');
	});

	it('rolls back a version command that fails after creating the tag', async () => {
		GivenFailingCommand('pnpm version minor');

		await expect(WhenReleasing()).rejects.toThrow('pnpm version minor failed');

		expect(calls()).toContain('git tag --delete v0.2.0');
		expect(calls()).toContain('git reset --hard original-head');
		expect(calls()).not.toContain('pnpm publish --access public');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: false,
		});
	});

	it('still restores the release commit when removing the tag fails', async () => {
		GivenFailingCommand('pnpm publish --access public');
		GivenFailingCommand('git tag --delete v0.2.0');

		await expect(WhenReleasing()).rejects.toThrow('Transaction failed and rollback was incomplete');

		expect(calls()).toContain('git reset --hard original-head');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: true,
		});
		expect(calls()).not.toContain('git push');
	});

	it('keeps the published version when pushing fails', async () => {
		GivenFailingCommand('git push');

		await expect(WhenReleasing()).rejects.toThrow('git push failed');

		expect(calls()).toContain('pnpm publish --access public');
		expect(head).toBe('release-head');
		expect(tagExists).toBe(true);
		expect(calls()).not.toContain('git reset --hard original-head');
	});

	it('keeps the published version when pushing the tag fails', async () => {
		GivenFailingCommand('git push --tags');

		await expect(WhenReleasing()).rejects.toThrow('git push --tags failed');

		expect(calls()).toContain('pnpm publish --access public');
		expect(head).toBe('release-head');
		expect(tagExists).toBe(true);
		expect(calls()).not.toContain('git reset --hard original-head');
	});

	it('keeps an existing tag untouched', async () => {
		GivenExistingTag();

		await expect(WhenReleasing()).resolves.toBe(Command.INVALID);

		expect(calls()).not.toContain('pnpm version minor');
		expect(calls()).not.toContain('git tag --delete v0.2.0');
		expect({ currentVersion, head, tagExists }).toEqual({
			currentVersion: '0.1.0', head: 'original-head', tagExists: true,
		});
	});
});

function GivenDirtyWorkingTree(): void {
	dirty = true;
}

function GivenNoNpmSession({ loginAuthenticates: authenticates = true }: { loginAuthenticates?: boolean } = {}): void {
	authenticated = false;
	loginAuthenticates = authenticates;
}

function GivenFailingCommand(call: string): void {
	failing.push(call);
}

function GivenExistingTag(): void {
	tagExists = true;
}

function WhenReleasing({ args = ['minor', '--force'], answer, project = '/project' }: {
	args?: string[];
	answer?: string;
	project?: Context['project'];
} = {}): Promise<number> {
	const terminal = new Terminal({ out: () => {}, err: () => {}, ask: async () => answer ?? null });

	return new TestReleaseCommand().run(terminal, args, { cwd: '/project', project });
}

function calls(): string[] {
	return execute.mock.calls.map(([command, args]) => `${command} ${args.join(' ')}`);
}
