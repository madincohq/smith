import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Files } from '@';
import { Probe, type Registry } from '@/inspect/probe';

const roots: string[] = [];

function fixture(tree: Record<string, string | object>): string {
	const root = mkdtempSync(join(tmpdir(), 'probe-'));

	Files.write(
		Object.entries(tree).map(([path, contents]) => ({
			path: join(root, path),
			contents: typeof contents === 'string' ? contents : JSON.stringify(contents),
		}))
	);

	roots.push(root);

	return root;
}

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('text', () => {
	it('reads a file from a path relative to the project root', () => {
		const root = fixture({ 'README.md': '# Hello' });

		expect(new Probe(root).text('README.md')).toBe('# Hello');
	});

	it('returns null when the file does not exist', () => {
		expect(new Probe(fixture({})).text('README.md')).toBeNull();
	});

	it('returns null when the path is a directory rather than a file', () => {
		const root = fixture({ 'src/index.ts': '' });

		expect(new Probe(root).text('src')).toBeNull();
	});
});

describe('json', () => {
	it('reads a file and parses it as json', () => {
		const root = fixture({ 'package.json': { name: 'demo' } });

		expect(new Probe(root).json<{ name: string }>('package.json')?.name).toBe('demo');
	});

	it('returns null when the file does not exist', () => {
		expect(new Probe(fixture({})).json('package.json')).toBeNull();
	});

	it('returns null instead of throwing when the json is malformed', () => {
		const root = fixture({ 'package.json': '{ not json' });

		expect(new Probe(root).json('package.json')).toBeNull();
	});
});

describe('caching', () => {
	it('reads a file once and reuses that result, even after the file is deleted', () => {
		const root = fixture({ 'package.json': { name: 'demo' } });
		const probe = new Probe(root);

		probe.json('package.json');
		rmSync(join(root, 'package.json'));

		expect(probe.json<{ name: string }>('package.json')?.name).toBe('demo');
	});

	it('remembers that a file was missing rather than looking for it again', () => {
		const root = fixture({});
		const probe = new Probe(root);

		probe.text('late.md');
		Files.write([{ path: join(root, 'late.md'), contents: 'here now' }]);

		expect(probe.text('late.md')).toBeNull();
	});
});

describe('exists', () => {
	it('is true for a file that is there', () => {
		const root = fixture({ 'storage/link': '' });

		expect(new Probe(root).exists('storage/link')).toBe(true);
	});

	it('is true for a directory that is there', () => {
		const root = fixture({ 'src/index.ts': '' });

		expect(new Probe(root).exists('src')).toBe(true);
	});

	it('is false for a path that is not there', () => {
		expect(new Probe(fixture({})).exists('storage/link')).toBe(false);
	});
});

describe('files', () => {
	const tree = {
		'src/pages/index.astro': '',
		'src/pages/blog/post.md': '',
		'src/components/Card.astro': '',
		'node_modules/astro/dist/page.astro': '',
	};

	it('lists paths matching the glob, relative to the root and alphabetically sorted', () => {
		expect(new Probe(fixture(tree)).files('src/**/*.astro')).toEqual([
			'src/components/Card.astro',
			'src/pages/index.astro',
		]);
	});

	it('expands brace patterns, so {astro,md} matches both extensions', () => {
		expect(new Probe(fixture(tree)).files('src/pages/**/*.{astro,md}')).toEqual([
			'src/pages/blog/post.md',
			'src/pages/index.astro',
		]);
	});

	it('skips node_modules, so an unanchored glob does not walk dependencies', () => {
		expect(new Probe(fixture(tree)).files('**/*.astro')).toEqual([
			'src/components/Card.astro',
			'src/pages/index.astro',
		]);
	});

	it('skips vendor, so an unanchored glob does not walk composer packages', () => {
		const root = fixture({
			'app/Models/User.php': '',
			'vendor/laravel/framework/src/Application.php': '',
		});

		expect(new Probe(root).files('**/*.php')).toEqual(['app/Models/User.php']);
	});

	it('lists files only, leaving out the directories a glob also matches', () => {
		expect(new Probe(fixture(tree)).files('src/**')).toEqual([
			'src/components/Card.astro',
			'src/pages/blog/post.md',
			'src/pages/index.astro',
		]);
	});

	it('returns an empty list when the globbed directory does not exist', () => {
		expect(new Probe(fixture({})).files('src/**/*.astro')).toEqual([]);
	});
});

describe('count', () => {
	it('counts how many files match the glob', () => {
		const root = fixture({ 'src/pages/a.astro': '', 'src/pages/b.astro': '' });

		expect(new Probe(root).count('src/pages/*.astro')).toBe(2);
	});

	it('counts zero when the glob matches nothing', () => {
		expect(new Probe(fixture({})).count('src/pages/*.astro')).toBe(0);
	});
});

describe('installed', () => {
	it('reports the version present in node_modules, not the range declared in package.json', () => {
		const root = fixture({
			'package.json': { dependencies: { astro: '^6.0.0' } },
			'node_modules/astro/package.json': { version: '6.4.2' },
		});

		expect(new Probe(root).installed('astro')).toBe('6.4.2');
	});

	it('reports the version of a scoped npm package', () => {
		const root = fixture({
			'node_modules/@astrojs/cloudflare/package.json': { version: '12.0.1' },
		});

		expect(new Probe(root).installed('@astrojs/cloudflare')).toBe('12.0.1');
	});

	it('reports a composer package from the vendor index, without composer version prefix', () => {
		const root = fixture({
			'vendor/composer/installed.json': {
				packages: [{ name: 'laravel/framework', version: 'v13.16.1' }],
			},
		});

		expect(new Probe(root).installed('laravel/framework')).toBe('13.16.1');
	});

	it('reads the legacy vendor index, which is a bare array instead of an object', () => {
		const root = fixture({
			'vendor/composer/installed.json': [{ name: 'laravel/framework', version: 'v11.0.0' }],
		});

		expect(new Probe(root).installed('laravel/framework')).toBe('11.0.0');
	});

	it('falls back to composer.lock when the package has not been vendored', () => {
		const root = fixture({
			'composer.lock': { packages: [{ name: 'laravel/framework', version: 'v13.16.1' }] },
		});

		expect(new Probe(root).installed('laravel/framework')).toBe('13.16.1');
	});

	it('finds a composer package that is only a dev dependency', () => {
		const root = fixture({
			'composer.lock': { 'packages-dev': [{ name: 'pestphp/pest', version: 'v4.1.0' }] },
		});

		expect(new Probe(root).installed('pestphp/pest')).toBe('4.1.0');
	});

	it('returns null when none of the registries know the package', () => {
		expect(new Probe(fixture({})).installed('astro')).toBeNull();
	});

	it('asks each registry in turn and stops at the first one that answers', () => {
		const known: Registry = (_probe, name) => (name === 'known' ? '1.0.0' : null);
		const everything: Registry = () => '2.0.0';
		const probe = new Probe(fixture({}), [known, everything]);

		expect(probe.installed('known')).toBe('1.0.0');
		expect(probe.installed('other')).toBe('2.0.0');
	});
});
