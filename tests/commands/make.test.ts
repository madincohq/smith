import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Command, Kernel, Terminal, type Sinks } from '@';
import { MakeCommand } from '@/commands/make';

let directory = '';

function harness() {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
	};

	return { out, err, kernel: Kernel.make(new Terminal(sinks)).add(new MakeCommand(directory)) };
}

function written(name: string): string {
	return readFileSync(join(directory, name), 'utf8');
}

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'smith-'));
});

afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
});

describe('handle', () => {
	it('writes a command file named after the command', async () => {
		expect(await harness().kernel.handle(['make:command', 'og'])).toBe(Command.SUCCESS);
		expect(written('og.ts')).toContain('export class OgCommand extends Command');
	});

	it('turns a namespaced name into a kebab-case file and a pascal-case class', async () => {
		await harness().kernel.handle(['make:command', 'cache:clear']);

		expect(written('cache-clear.ts')).toContain('export class CacheClearCommand extends Command');
		expect(written('cache-clear.ts')).toContain("readonly name = 'cache:clear'");
	});

	it('uses the given description', async () => {
		await harness().kernel.handle(['make:command', 'og', '--description=Capture the images']);

		expect(written('og.ts')).toContain("readonly description = 'Capture the images'");
	});

	it('falls back to a placeholder description', async () => {
		await harness().kernel.handle(['make:command', 'og']);

		expect(written('og.ts')).toContain("readonly description = 'Command description'");
	});

	it('reports the path it wrote', async () => {
		const { out, kernel } = harness();
		await kernel.handle(['make:command', 'og']);

		expect(out.join('')).toContain(join(directory, 'og.ts'));
	});

	it('refuses to overwrite an existing command', async () => {
		writeFileSync(join(directory, 'og.ts'), 'mine');

		const { err, kernel } = harness();

		expect(await kernel.handle(['make:command', 'og'])).toBe(Command.INVALID);
		expect(err.join('')).toContain('already exists');
		expect(written('og.ts')).toBe('mine');
	});

	it('overwrites when forced', async () => {
		writeFileSync(join(directory, 'og.ts'), 'mine');

		expect(await harness().kernel.handle(['make:command', 'og', '--force'])).toBe(Command.SUCCESS);
		expect(written('og.ts')).toContain('OgCommand');
	});

	it('requires a name', async () => {
		const { err, kernel } = harness();

		expect(await kernel.handle(['make:command'])).toBe(Command.INVALID);
		expect(err.join('')).toContain('Not enough arguments (missing: "name").');
	});

	it('rejects a name that is not a valid command name', async () => {
		const { err, kernel } = harness();

		expect(await kernel.handle(['make:command', 'Og Command'])).toBe(Command.INVALID);
		expect(err.join('')).toContain('is not a valid command name');
	});
});
