import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { binary, directories, locate, target } from '@/cli/resolve';

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

	it('finds an ES module project', () => {
		const root = join(directory, 'esm');
		manifest(root, { type: 'module' });

		expect(locate(root).project?.root).toBe(root);
	});

	it('finds a CommonJS project', () => {
		const root = join(directory, 'cjs');
		manifest(root, {});

		expect(locate(root).project?.root).toBe(root);
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

describe('binary', () => {
	function installSmith(root: string): string {
		const bin = join(root, 'node_modules', '@madinco', 'smith', 'bin');

		mkdirSync(bin, { recursive: true });
		writeFileSync(join(bin, 'smith.js'), '');

		return join(bin, 'smith.js');
	}

	it('finds the binary installed in the directory it starts from', () => {
		const root = realpathSync(directory);
		const bin = installSmith(root);

		expect(binary(root)).toBe(bin);
	});

	it('climbs to the binary installed in a parent', () => {
		const root = realpathSync(directory);
		const bin = installSmith(root);
		const nested = join(root, 'src', 'console');

		mkdirSync(nested, { recursive: true });

		expect(binary(nested)).toBe(bin);
	});

	it('stops at the first binary it finds rather than climbing past it', () => {
		const root = realpathSync(directory);
		installSmith(root);

		const deeper = join(root, 'packages', 'site');
		mkdirSync(deeper, { recursive: true });
		const nearest = installSmith(deeper);

		expect(binary(deeper)).toBe(nearest);
	});

	it('finds nothing when no binary is installed anywhere above', () => {
		expect(binary(realpathSync(directory))).toBeNull();
	});

	it('finds nothing when the directory it starts from is gone', () => {
		expect(binary(join(directory, 'nope'))).toBeNull();
	});

	it('resolves a symlinked install to the binary it really is', () => {
		const root = realpathSync(directory);
		const checkout = join(root, 'checkout', 'bin');

		mkdirSync(checkout, { recursive: true });
		writeFileSync(join(checkout, 'smith.js'), '');

		const link = join(root, 'project', 'node_modules', '@madinco', 'smith');
		mkdirSync(dirname(link), { recursive: true });
		symlinkSync(join(root, 'checkout'), link, 'junction');

		expect(binary(join(root, 'project'))).toBe(join(checkout, 'smith.js'));
	});
});
