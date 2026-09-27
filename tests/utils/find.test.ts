import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Find, type Found, type Matcher, type Search } from '@';

const roots: string[] = [];

afterEach(() => {
	while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

describe('nearest', () => {
	it('returns the starting directory when it matches', () => {
		const root = GivenFiles('composer.json');

		expect(WhenFindingNearest(root, Find.containing('composer.json'))).toBe(root);
	});

	it('returns the closest matching parent', () => {
		const root = GivenFiles('composer.json', 'app/Models/User.php');

		expect(WhenFindingNearest(join(root, 'app/Models'), Find.containing('composer.json'))).toBe(root);
	});

	it('prefers the closest match over a higher one', () => {
		const root = GivenFiles('package.json', 'packages/ui/package.json', 'packages/ui/src/a.ts');

		expect(WhenFindingNearest(join(root, 'packages/ui/src'), Find.containing('package.json'))).toBe(
			join(root, 'packages/ui'),
		);
	});

	it('returns null when nothing matches', () => {
		const root = GivenFiles('notes/readme.md');

		expect(WhenFindingNearest(join(root, 'notes'), Find.containing('a-marker-nobody-has.lock'))).toBeNull();
	});

	it('starts from a directory that does not exist', () => {
		const root = GivenFiles('composer.json');

		expect(WhenFindingNearest(join(root, 'gone/deeper'), Find.containing('composer.json'))).toBe(root);
	});
});

describe('within', () => {
	it('returns matching files at any depth, sorted', () => {
		const root = GivenFiles('pages/deep/c.ts', 'a.ts', 'pages/b.ts', 'pages/d.css');

		expect(WhenFindingWithin(root, { include: Find.extension('.ts') })).toEqual(['a.ts', 'pages/b.ts', 'pages/deep/c.ts']);
	});

	it('does not look inside an included directory', () => {
		const root = GivenFiles('hub/composer.json', 'hub/packages/ui/composer.json');

		expect(WhenFindingWithin(root, { include: Find.containing('composer.json') })).toEqual(['hub']);
	});

	it('does not enter an excluded directory', () => {
		const root = GivenFiles('node_modules/x/a.ts', 'src/b.ts');

		expect(WhenFindingWithin(root, { include: Find.extension('.ts'), exclude: Find.named('node_modules') })).toEqual([
			'src/b.ts',
		]);
	});

	it('excludes win over includes', () => {
		const root = GivenFiles('a.ts', 'b.ts');

		expect(WhenFindingWithin(root, { include: Find.extension('.ts'), exclude: Find.named('b.ts') })).toEqual(['a.ts']);
	});

	it('finds hidden files', () => {
		const root = GivenFiles('.env', '.env.example', 'readme.md');

		expect(WhenFindingWithin(root, { include: Find.named('.env', '.env.example') })).toEqual(['.env', '.env.example']);
	});

	it('gives paths relative to root', () => {
		const root = GivenFiles('madinco/hub/composer.json');
		const seen: Found[] = [];

		WhenFindingWithin(join(root, 'madinco'), { include: (found) => seen.push(found) > 0 && found.directory });

		expect(seen).toContainEqual({ name: 'hub', path: 'hub', absolute: join(root, 'madinco/hub'), directory: true });
	});

	it('does not follow symlinks', () => {
		const root = GivenFiles('site/a.ts');

		GivenLink(root, 'loop/back');

		expect(WhenFindingWithin(root, { include: Find.extension('.ts') })).toEqual(['site/a.ts']);
	});

	it('returns nothing for a missing root', () => {
		const root = GivenFiles();

		expect(WhenFindingWithin(join(root, 'nowhere'), { include: () => true })).toEqual([]);
	});
});

describe('containing', () => {
	it('matches a directory containing any of the files', () => {
		const root = GivenFiles('site/package.json');

		expect(WhenMatching(Find.containing('composer.json', 'package.json'), root, 'site')).toBe(true);
	});

	it('does not match a directory without them', () => {
		const root = GivenFiles('notes/readme.md');

		expect(WhenMatching(Find.containing('composer.json', 'package.json'), root, 'notes')).toBe(false);
	});

	it('does not match a file', () => {
		const root = GivenFiles('package.json');

		expect(WhenMatching(Find.containing('package.json'), root, 'package.json')).toBe(false);
	});
});

describe('named', () => {
	it('matches any of the names', () => {
		const root = GivenFiles('vendor/x.php');

		expect(WhenMatching(Find.named('node_modules', 'vendor'), root, 'vendor')).toBe(true);
	});

	it('matches whole names only', () => {
		const root = GivenFiles('vendored/x.php');

		expect(WhenMatching(Find.named('vendor'), root, 'vendored')).toBe(false);
	});
});

describe('glob', () => {
	it('matches a path against any of the patterns', () => {
		const root = GivenFiles('archives/illimicine/package.json');

		expect(WhenMatching(Find.glob('archives/**', 'old/**'), root, 'archives/illimicine')).toBe(true);
	});

	it('matches the path from root, not the name', () => {
		const root = GivenFiles('madinco/archives/package.json');

		expect(WhenMatching(Find.glob('archives/**'), root, 'madinco/archives')).toBe(false);
	});
});

describe('extension', () => {
	it('matches any of the extensions', () => {
		const root = GivenFiles('pages/b.tsx');

		expect(WhenMatching(Find.extension('.ts', '.tsx'), root, 'pages/b.tsx')).toBe(true);
	});

	it('does not match a directory', () => {
		const root = GivenFiles('routes.ts/index.php');

		expect(WhenMatching(Find.extension('.ts'), root, 'routes.ts')).toBe(false);
	});
});

function GivenFiles(...paths: string[]): string {
	const root = mkdtempSync(join(tmpdir(), 'find-'));

	roots.push(root);

	for (const path of paths) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), '');
	}

	return root;
}

function GivenLink(target: string, path: string): void {
	mkdirSync(dirname(join(target, path)), { recursive: true });
	symlinkSync(target, join(target, path));
}

function WhenFindingNearest(from: string, matcher: Matcher): string | null {
	return Find.nearest(from, matcher);
}

function WhenFindingWithin(root: string, search: Search): string[] {
	return Find.within(root, search);
}

function WhenMatching(matcher: Matcher, root: string, path: string): boolean {
	return matcher(Find.at(root, path));
}
