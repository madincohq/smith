import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	Command,
	Kernel,
	Terminal,
	flag,
	number,
	option,
	type Context,
	type Section,
	type Sinks,
} from '@';

class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello';

	readonly options = {
		name: option('world', 'Who to greet'),
		times: number(1, 'How many times'),
		loud: flag('Shout it'),
	};

	handle(): number {
		const greeting = `Hello, ${this.option('name')}`;

		for (let index = 0; index < this.option('times'); index += 1) {
			this.line(this.option('loud') ? greeting.toUpperCase() : greeting);
		}

		return Command.SUCCESS;
	}
}

class BoomCommand extends Command {
	readonly name = 'boom';
	readonly description = 'Always throws';

	handle(): number {
		throw new Error('No dev server on http://mco.localhost');
	}
}

function recorder(context?: Context) {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
	};

	return { out, err, kernel: Kernel.make(new Terminal(sinks), context) };
}

function harness() {
	const { out, err, kernel } = recorder();

	return { out, err, kernel: kernel.add(new GreetCommand()).add(new BoomCommand()) };
}

describe('handle', () => {
	it('dispatches to the named command', async () => {
		const { out, kernel } = harness();

		expect(await kernel.handle(['greet'])).toBe(Command.SUCCESS);
		expect(out).toEqual(['Hello, world\n']);
	});

	it('passes the remaining argv to the command', async () => {
		const { out, kernel } = harness();
		await kernel.handle(['greet', '--name=Mathieu', '--times=2', '--loud']);

		expect(out).toEqual(['HELLO, MATHIEU\n', 'HELLO, MATHIEU\n']);
	});

	it('lists the commands when given nothing', async () => {
		const { out, kernel } = harness();

		expect(await kernel.handle([])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('greet  Say hello');
	});

	it('registers the built-in commands', async () => {
		const { out, kernel } = harness();
		await kernel.handle(['list']);

		expect(out.join('')).toContain('help');
		expect(out.join('')).toContain('list');
	});

	it('treats --help on a command as a request for its usage', async () => {
		const { out, kernel } = harness();

		expect(await kernel.handle(['greet', '--help'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('--name[=NAME]');
		expect(out.join('')).not.toContain('Hello, world');
	});

	it('treats a bare --help as a request for the list', async () => {
		const { out, kernel } = harness();

		expect(await kernel.handle(['--help'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('Available commands');
	});

	it('reports an unknown command and returns the invalid code', async () => {
		const { err, kernel } = harness();

		expect(await kernel.handle(['nope'])).toBe(Command.INVALID);
		expect(err[0]).toContain('Unknown command "nope"');
	});

	it('names an undeclared option and returns the invalid code', async () => {
		const { err, kernel } = harness();

		expect(await kernel.handle(['greet', '--nope'])).toBe(Command.INVALID);
		expect(err[0]).toContain('The "--nope" option does not exist.');
	});

	it('shows the usage after an undeclared option', async () => {
		const { out, kernel } = harness();
		await kernel.handle(['greet', '--nope']);

		expect(out.join('')).toContain('--name[=NAME]');
	});

	it('turns a thrown error into the failure code', async () => {
		const { err, kernel } = harness();

		expect(await kernel.handle(['boom'])).toBe(Command.FAILURE);
		expect(err[0]).toContain('No dev server on http://mco.localhost');
	});

	it('names the command that failed, so the message is not orphaned', async () => {
		const { err, kernel } = harness();

		await kernel.handle(['boom']);

		expect(err[0]).toContain('boom failed:');
	});

	it('keeps the stack to itself unless SMITH_DEBUG asks for it', async () => {
		const { err, kernel } = harness();

		await kernel.handle(['boom']);

		expect(err.join('')).not.toContain('at BoomCommand');
	});

	it('prints the stack when SMITH_DEBUG asks for it', async () => {
		const { err, kernel } = harness();

		vi.stubEnv('SMITH_DEBUG', '1');
		await kernel.handle(['boom']);
		vi.unstubAllEnvs();

		expect(err.join('')).toContain('at BoomCommand');
	});

	it('lets an error render its own explanation, whoever defined it', async () => {
		class Unconfigured extends Error {
			render(): Section[] {
				return [{ title: 'Next step', lines: ['Run smith init'] }];
			}
		}

		class SetupCommand extends Command {
			readonly name = 'setup';
			readonly description = 'Needs configuring first';

			handle(): number {
				throw new Unconfigured('smith is not configured here.');
			}
		}

		const { out, err, kernel } = recorder();
		kernel.add(new SetupCommand());

		expect(await kernel.handle(['setup'])).toBe(Command.INVALID);
		expect(err.join('')).toContain('smith is not configured here.');
		expect(out.join('')).toContain('Run smith init');
	});
});

let directory = '';

function generated(file: string, name: string): void {
	writeFileSync(
		join(directory, file),
		`import { Command } from '@';
		export class Generated extends Command {
			readonly name = '${name}';
			readonly description = 'Generated for a test';
			handle() { this.line('ran'); return Command.SUCCESS; }
		}`
	);
}

describe('discover', () => {
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'smith-'));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	it('registers a command found in the directory', async () => {
		generated('greet.ts', 'greet');

		const { out, kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['greet'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('ran');
	});

	it('registers every command in the directory', async () => {
		generated('greet.ts', 'greet');
		generated('farewell.ts', 'farewell');

		const { out, kernel } = recorder();
		await kernel.discover(directory);
		await kernel.handle(['list']);

		expect(out.join('')).toContain('greet');
		expect(out.join('')).toContain('farewell');
	});

	it('lists a discovered command alongside the built-ins', async () => {
		generated('greet.ts', 'greet');

		const { out, kernel } = recorder();
		await kernel.discover(directory);
		await kernel.handle(['list']);

		expect(out.join('')).toContain('greet');
		expect(out.join('')).toContain('help');
	});

	it('ignores test files', async () => {
		generated('greet.test.ts', 'greet');

		const { kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['greet'])).toBe(Command.INVALID);
	});

	it('reports a module that exports no command and keeps going', async () => {
		writeFileSync(join(directory, 'helpers.ts'), 'export const helper = () => 1;');

		const { err, kernel } = recorder();
		await kernel.discover(directory);

		expect(err.join('')).toContain('no command class exported');
		expect(await kernel.handle(['list'])).toBe(Command.SUCCESS);
	});

	it('says nothing about a file prefixed with an underscore', async () => {
		writeFileSync(join(directory, '_helpers.ts'), 'export const helper = () => 1;');

		const { err, kernel } = recorder();
		await kernel.discover(directory);

		expect(err).toEqual([]);
	});

	it('skips a directory prefixed with an underscore', async () => {
		mkdirSync(join(directory, '_support'));
		generated(join('_support', 'greet.ts'), 'greet');

		const { kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['greet'])).toBe(Command.INVALID);
	});

	it('skips a dot directory', async () => {
		mkdirSync(join(directory, '.cache'));
		generated(join('.cache', 'greet.ts'), 'greet');

		const { kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['greet'])).toBe(Command.INVALID);
	});

	it('registers a command found in a nested directory', async () => {
		mkdirSync(join(directory, 'make'));
		generated(join('make', 'greet.ts'), 'greet');

		const { out, kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['greet'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('ran');
	});

	it('ignores a base class that declares no name', async () => {
		writeFileSync(
			join(directory, 'base.ts'),
			`import { Command } from '@';
			export abstract class Base extends Command {
				readonly description = 'Shared by other commands';
				handle() { return Command.SUCCESS; }
			}`
		);

		const { out, kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['list'])).toBe(Command.SUCCESS);
		expect(out.join('')).not.toContain('Shared by other commands');
	});

	it('registers a command exported inside an object', async () => {
		writeFileSync(
			join(directory, 'grouped.ts'),
			`import { Command } from '@';
			class Generated extends Command {
				readonly name = 'grouped';
				readonly description = 'Generated for a test';
				handle() { this.line('ran'); return Command.SUCCESS; }
			}
			export default { Generated };`
		);

		const { out, kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['grouped'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('ran');
	});

	it('survives a directory that does not exist', async () => {
		const { kernel } = recorder();

		await expect(kernel.discover(join(directory, 'nope'))).resolves.toBe(kernel);
	});

	it('registers a command extending the Command of another copy of smith', async () => {
		writeFileSync(
			join(directory, 'foreign.ts'),
			`const COMMAND = Symbol.for('smith.command');

			class Command {
				name = 'foreign';
				description = 'Built against a second copy of smith';
				run(terminal) { terminal.line('ran foreign'); return 0; }
			}

			Command[COMMAND] = true;

			export class Foreign extends Command {}`
		);

		const { out, kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['foreign'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('ran foreign');
	});

	it('ignores an exported class that carries no command marker', async () => {
		writeFileSync(
			join(directory, 'plain.ts'),
			`export class NotACommand {
				name = 'plain';
				description = 'Looks like one, is not';
				run() { return 0; }
			}`
		);

		const { kernel } = recorder();
		await kernel.discover(directory);

		expect(await kernel.handle(['plain'])).toBe(Command.INVALID);
	});

	it('sums up the files that export no command rather than naming every one', async () => {
		for (const name of ['one.ts', 'two.ts', 'three.ts']) {
			writeFileSync(join(directory, name), 'export const value = 1;');
		}

		const { err, kernel } = recorder();
		await kernel.discover(directory);

		expect(err.join('')).toContain('Skipped 3 files');
		expect(err.join('')).not.toContain('one.ts');
	});

	it('names the file when only one of them exports no command', async () => {
		writeFileSync(join(directory, 'lonely.ts'), 'export const value = 1;');

		const { err, kernel } = recorder();
		await kernel.discover(directory);

		expect(err.join('')).toContain('lonely.ts');
	});

	it('names a file that failed to import even when others were skipped quietly', async () => {
		writeFileSync(join(directory, 'broken.ts'), "throw new Error('boom at import time');");

		for (const name of ['one.ts', 'two.ts']) {
			writeFileSync(join(directory, name), 'export const value = 1;');
		}

		const { err, kernel } = recorder();
		await kernel.discover(directory);

		expect(err.join('')).toContain('broken.ts');
		expect(err.join('')).toContain('Skipped 2 files');
	});

	it('reports a file that throws on import and keeps going', async () => {
		writeFileSync(join(directory, 'broken.ts'), "throw new Error('boom at import time');");
		generated('greet.ts', 'greet');

		const { err, kernel } = recorder();
		await kernel.discover(directory);

		expect(err.join('')).toContain('boom at import time');
		expect(await kernel.handle(['greet'])).toBe(Command.SUCCESS);
	});
});

class WhereCommand extends Command {
	readonly name = 'where';
	readonly description = 'Report the context it ran in';

	handle(): number {
		this.line(`${this.cwd} ${this.project}`);

		return Command.SUCCESS;
	}
}

describe('context', () => {
	it('hands the command the cwd and project root it was given', async () => {
		const { out, kernel } = recorder({ cwd: '/work/site/deep', project: '/work/site' });
		await kernel.add(new WhereCommand()).handle(['where']);

		expect(out).toEqual(['/work/site/deep /work/site\n']);
	});

	it('reports no project root when there is none', async () => {
		const { out, kernel } = recorder({ cwd: '/tmp', project: null });
		await kernel.add(new WhereCommand()).handle(['where']);

		expect(out).toEqual(['/tmp null\n']);
	});

	it('falls back to the process cwd when no context is given', async () => {
		const { out, kernel } = recorder();
		await kernel.add(new WhereCommand()).handle(['where']);

		expect(out).toEqual([`${process.cwd()} null\n`]);
	});
});
