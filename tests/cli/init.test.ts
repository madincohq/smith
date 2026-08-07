import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Command, Kernel, Terminal, type Sinks } from '@';
import { InitCommand } from '@/cli/init';
import type { Location, Project } from '@/cli/resolve';

let directory = '';

function outside(): Location {
	const home = join(directory, 'home');

	return { cwd: directory, home, global: join(home, 'commands'), project: null };
}

function inside(module = true): Location {
	const project: Project = {
		root: directory,
		commands: join(directory, 'src', 'console', 'commands'),
		module,
	};

	return { ...outside(), project };
}

function harness(location: Location) {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
		columns: () => 80,
		decorated: false,
		interactive: false,
	};

	const kernel = Kernel.make(new Terminal(sinks), {
		cwd: location.cwd,
		project: location.project?.root ?? null,
	}).add(new InitCommand(location));

	return { out, err, kernel };
}

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'smith-'));
});

afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
});

describe('handle', () => {
	it('creates the global directory when there is no project', async () => {
		const location = outside();

		expect(await harness(location).kernel.handle(['init'])).toBe(Command.SUCCESS);
		expect(existsSync(location.global)).toBe(true);
	});

	it('creates the project directory when there is a project', async () => {
		const location = inside();
		await harness(location).kernel.handle(['init']);

		expect(existsSync(location.project?.commands ?? '')).toBe(true);
		expect(existsSync(location.global)).toBe(false);
	});

	it('creates the global directory when forced inside a project', async () => {
		const location = inside();
		await harness(location).kernel.handle(['init', '--global']);

		expect(existsSync(location.global)).toBe(true);
		expect(existsSync(location.project?.commands ?? '')).toBe(false);
	});

	it('says so rather than failing when the directory is already there', async () => {
		const location = outside();
		await harness(location).kernel.handle(['init']);

		const second = harness(location);

		expect(await second.kernel.handle(['init'])).toBe(Command.SUCCESS);
		expect(second.out.join('')).toContain('already exists');
	});

	it('writes no launcher unless asked', async () => {
		await harness(inside()).kernel.handle(['init']);

		expect(existsSync(join(directory, 'smith'))).toBe(false);
	});

	it('writes a launcher that delegates to the package', async () => {
		await harness(inside()).kernel.handle(['init', '--shim']);

		expect(readFileSync(join(directory, 'smith'), 'utf8')).toContain(
			"import '@madinco/smith/bin'"
		);
	});

	it('makes the launcher executable', async () => {
		await harness(inside()).kernel.handle(['init', '--shim']);

		expect(statSync(join(directory, 'smith')).mode & 0o111).not.toBe(0);
	});

	it('refuses the launcher when the project is not an ES module', async () => {
		const { err, kernel } = harness(inside(false));
		await kernel.handle(['init', '--shim']);

		expect(err.join('')).toContain('not "type": "module"');
		expect(existsSync(join(directory, 'smith'))).toBe(false);
	});

	it('leaves an existing launcher alone', async () => {
		writeFileSync(join(directory, 'smith'), 'mine');
		await harness(inside()).kernel.handle(['init', '--shim']);

		expect(readFileSync(join(directory, 'smith'), 'utf8')).toBe('mine');
	});

	it('writes no launcher for a global init', async () => {
		await harness(inside()).kernel.handle(['init', '--global', '--shim']);

		expect(existsSync(join(directory, 'smith'))).toBe(false);
	});
});
