import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Files, Terminal, type Sinks } from '@';
import { Detail, type Profile } from '@/inspect/detail';
import { AboutCommand } from '@/commands/about';

const roots: string[] = [];

function fixture(tree: Record<string, string | object>): string {
	const root = mkdtempSync(join(tmpdir(), 'about-'));

	Files.write(
		Object.entries(tree).map(([path, contents]) => ({
			path: join(root, path),
			contents: typeof contents === 'string' ? contents : JSON.stringify(contents),
		}))
	);

	roots.push(root);

	return root;
}

function recording(): { lines: string[]; sinks: Sinks } {
	const lines: string[] = [];

	return {
		lines,
		sinks: { out: (text) => lines.push(...text.split('\n')), err: () => {} },
	};
}

async function about(profiles: Profile[], root: string): Promise<string[]> {
	const { lines, sinks } = recording();

	await new AboutCommand(profiles).run(new Terminal(sinks), [], { cwd: root, project: root });

	return lines.filter((line) => line !== '');
}

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const astro: Profile = {
	section: 'Astro',
	when: Detail.version('astro'),
	details: {
		Version: Detail.version('astro'),
		Pages: Detail.count('src/pages/**/*.astro'),
	},
};

describe('about', () => {
	it('reports a section for every profile that matches the project', async () => {
		const root = fixture({
			'node_modules/astro/package.json': { version: '6.4.6' },
			'src/pages/index.astro': '',
		});

		expect(await about([astro], root)).toEqual(['  Astro', '  Version: 6.4.6', '  Pages: 1']);
	});

	it('says so plainly when it recognises nothing in the project', async () => {
		expect(await about([astro], fixture({}))).toEqual([
			'No recognised frameworks in this project.',
		]);
	});

	it('inspects the project root rather than the working directory', async () => {
		const root = fixture({ 'node_modules/astro/package.json': { version: '6.4.6' } });
		const { lines, sinks } = recording();

		await new AboutCommand([astro]).run(new Terminal(sinks), [], {
			cwd: join(root, 'src/pages'),
			project: root,
		});

		expect(lines).toContain('  Version: 6.4.6');
	});

	it('falls back to the working directory when there is no project', async () => {
		const root = fixture({ 'node_modules/astro/package.json': { version: '6.4.6' } });
		const { lines, sinks } = recording();

		await new AboutCommand([astro]).run(new Terminal(sinks), [], { cwd: root, project: null });

		expect(lines).toContain('  Version: 6.4.6');
	});
});
