import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Command, Terminal, type Sinks } from '@';
import { run } from '@/cli/run';

let directory = '';
let home = '';
let project = '';

const environment = { ...process.env };

function recorder() {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
		columns: () => 80,
		decorated: false,
		interactive: false,
	};

	return { out, err, terminal: new Terminal(sinks) };
}

function command(directory: string, name: string, says: string): void {
	mkdirSync(directory, { recursive: true });

	writeFileSync(
		join(directory, `${name}.ts`),
		`import { Command } from '@';
		export class Generated extends Command {
			readonly name = '${name}';
			readonly description = 'Generated for a test';
			handle() { this.line('${says}'); return Command.SUCCESS; }
		}`
	);
}

function globally(name: string, says: string): void {
	command(join(home, 'commands'), name, says);
}

function locally(name: string, says: string): void {
	command(join(project, 'src', 'console', 'commands'), name, says);
}

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'smith-'));
	home = join(directory, 'home');
	project = join(directory, 'site');

	mkdirSync(project, { recursive: true });
	writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'site', type: 'module' }));

	process.env.SMITH_HOME = home;
	delete process.env.XDG_CONFIG_HOME;
});

afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
	process.env = { ...environment };
});

describe('run', () => {
	it('runs a global command from outside any project', async () => {
		globally('greet', 'global greet');

		const { out, terminal } = recorder();

		expect(await run(['greet'], directory, terminal)).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('global greet');
	});

	it('runs a project command from inside the project', async () => {
		locally('deploy', 'project deploy');

		const { out, terminal } = recorder();

		expect(await run(['deploy'], project, terminal)).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('project deploy');
	});

	it('prefers the project command when both declare the same name', async () => {
		globally('greet', 'global greet');
		locally('greet', 'project greet');

		const { out, terminal } = recorder();
		await run(['greet'], project, terminal);

		expect(out.join('')).toContain('project greet');
		expect(out.join('')).not.toContain('global greet');
	});

	it('still runs the global command from outside that project', async () => {
		globally('greet', 'global greet');
		locally('greet', 'project greet');

		const { out, terminal } = recorder();
		await run(['greet'], directory, terminal);

		expect(out.join('')).toContain('global greet');
		expect(out.join('')).not.toContain('project greet');
	});

	it('reaches the project from one of its subdirectories', async () => {
		locally('deploy', 'project deploy');

		const nested = join(project, 'src', 'pages');
		mkdirSync(nested, { recursive: true });

		const { out, terminal } = recorder();
		await run(['deploy'], nested, terminal);

		expect(out.join('')).toContain('project deploy');
	});

	it('lists global and project commands together', async () => {
		globally('clean', 'cleaned');
		locally('deploy', 'deployed');

		const { out, terminal } = recorder();
		await run(['list'], project, terminal);

		expect(out.join('')).toContain('clean');
		expect(out.join('')).toContain('deploy');
		expect(out.join('')).toContain('make:command');
	});

	it('reports an unknown command', async () => {
		const { err, terminal } = recorder();

		expect(await run(['nope'], project, terminal)).toBe(Command.INVALID);
		expect(err.join('')).toContain('Unknown command "nope"');
	});
});
