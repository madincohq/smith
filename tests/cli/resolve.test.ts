import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { directories, locate, target } from '@/cli/resolve';

let directory = '';

const environment = { ...process.env };

function manifest(at: string, contents: Record<string, unknown>): void {
	mkdirSync(at, { recursive: true });
	writeFileSync(join(at, 'package.json'), JSON.stringify(contents));
}

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'smith-'));
	process.env.SMITH_HOME = join(directory, 'home');
	delete process.env.XDG_CONFIG_HOME;
});

afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
	process.env = { ...environment };
});

describe('locate', () => {
	it('finds the project whose package.json sits in the current directory', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site' });

		expect(locate(root).project?.root).toBe(root);
	});

	it('finds the project from a nested directory', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site' });
		mkdirSync(join(root, 'src', 'pages'), { recursive: true });

		expect(locate(join(root, 'src', 'pages')).project?.root).toBe(root);
	});

	it('reports no project when no package.json sits above the directory', () => {
		expect(locate(directory).project).toBeNull();
	});

	it('defaults the project commands to src/console/commands', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site' });

		expect(locate(root).project?.commands).toBe(join(root, 'src', 'console', 'commands'));
	});

	it('takes the commands directory declared in the manifest', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site', smith: { commands: 'console/commands' } });

		expect(locate(root).project?.commands).toBe(join(root, 'console', 'commands'));
	});

	it('leaves an absolute commands directory alone', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site', smith: { commands: '/opt/commands' } });

		expect(locate(root).project?.commands).toBe('/opt/commands');
	});

	it('notes whether the project is an ES module', () => {
		const esm = join(directory, 'esm');
		const cjs = join(directory, 'cjs');
		manifest(esm, { type: 'module' });
		manifest(cjs, {});

		expect(locate(esm).project?.module).toBe(true);
		expect(locate(cjs).project?.module).toBe(false);
	});

	it('survives a manifest that is not valid JSON', () => {
		const root = join(directory, 'site');
		mkdirSync(root, { recursive: true });
		writeFileSync(join(root, 'package.json'), '{ broken');

		expect(locate(root).project?.commands).toBe(join(root, 'src', 'console', 'commands'));
	});

	it('puts the global commands under SMITH_HOME', () => {
		expect(locate(directory).global).toBe(join(directory, 'home', 'commands'));
	});

	it('falls back to XDG_CONFIG_HOME', () => {
		delete process.env.SMITH_HOME;
		process.env.XDG_CONFIG_HOME = join(directory, 'xdg');

		expect(locate(directory).home).toBe(join(directory, 'xdg', 'smith'));
	});

	it('falls back to ~/.config/smith', () => {
		delete process.env.SMITH_HOME;

		expect(locate(directory).home).toBe(join(homedir(), '.config', 'smith'));
	});
});

describe('directories', () => {
	it('loads the global directory before the project one', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site' });

		expect(directories(locate(root))).toEqual([
			join(directory, 'home', 'commands'),
			join(root, 'src', 'console', 'commands'),
		]);
	});

	it('loads only the global directory outside a project', () => {
		expect(directories(locate(directory))).toEqual([join(directory, 'home', 'commands')]);
	});
});

describe('target', () => {
	it('writes into the project when there is one', () => {
		const root = join(directory, 'site');
		manifest(root, { name: 'site' });

		expect(target(locate(root))).toBe(join(root, 'src', 'console', 'commands'));
	});

	it('writes into the global directory otherwise', () => {
		expect(target(locate(directory))).toBe(join(directory, 'home', 'commands'));
	});
});
