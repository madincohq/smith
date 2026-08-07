import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Command, Kernel, Terminal, flag, number, option, type Context, type Sinks } from '@';

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
		columns: () => 80,
		decorated: false,
		interactive: false,
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

		expect(err.join('')).toContain('it exports no named command');
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

	it('survives a directory that does not exist', async () => {
		const { kernel } = recorder();

		await expect(kernel.discover(join(directory, 'nope'))).resolves.toBe(kernel);
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
