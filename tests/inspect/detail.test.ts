import { describe, expect, it } from 'vitest';
import type { Inspector } from '@/inspect/probe';
import { Detail, inspect, type Profile } from '@/inspect/detail';

interface Setup {
	json?: Record<string, unknown>;
	exists?: string[];
	counts?: Record<string, number>;
	installed?: Record<string, string>;
}

function probing(setup: Setup = {}): Inspector {
	return {
		text: () => null,
		json: <T>(path: string) => (setup.json?.[path] as T) ?? null,
		exists: (path: string) => (setup.exists ?? []).includes(path),
		files: () => [],
		count: (pattern: string) => setup.counts?.[pattern] ?? 0,
		installed: (name: string) => setup.installed?.[name] ?? null,
	};
}

describe('Detail', () => {
	describe('version', () => {
		it('resolves to the installed version of the package', () => {
			const probe = probing({ installed: { astro: '6.4.2' } });

			expect(Detail.version('astro')(probe)).toBe('6.4.2');
		});

		it('resolves to null when the package is not installed', () => {
			expect(Detail.version('astro')(probing())).toBeNull();
		});
	});

	describe('dependency', () => {
		it('resolves to the name of a package declared in dependencies', () => {
			const probe = probing({ json: { 'package.json': { dependencies: { astro: '^6.0.0' } } } });

			expect(Detail.dependency('astro')(probe)).toBe('astro');
		});

		it('looks in devDependencies as well', () => {
			const probe = probing({
				json: { 'package.json': { devDependencies: { vitest: '^4.0.0' } } },
			});

			expect(Detail.dependency('vitest')(probe)).toBe('vitest');
		});

		it('looks in composer.json as well as package.json', () => {
			const probe = probing({
				json: { 'composer.json': { require: { 'laravel/framework': '^13.0' } } },
			});

			expect(Detail.dependency('laravel/framework')(probe)).toBe('laravel/framework');
		});

		it('looks in composer dev requirements as well', () => {
			const probe = probing({
				json: { 'composer.json': { 'require-dev': { 'pestphp/pest': '^4.0' } } },
			});

			expect(Detail.dependency('pestphp/pest')(probe)).toBe('pestphp/pest');
		});

		it('resolves a pattern to the name of the first package matching it', () => {
			const probe = probing({
				json: {
					'package.json': { dependencies: { astro: '^6.0.0', '@astrojs/cloudflare': '^12.0.0' } },
				},
			});

			expect(Detail.dependency(/^@astrojs\//)(probe)).toBe('@astrojs/cloudflare');
		});

		it('resolves to null when nothing declares the package', () => {
			expect(Detail.dependency('astro')(probing())).toBeNull();
		});
	});

	describe('count', () => {
		it('resolves to how many files match the pattern', () => {
			const probe = probing({ counts: { 'src/pages/**/*.astro': 24 } });

			expect(Detail.count('src/pages/**/*.astro')(probe)).toBe(24);
		});

		it('resolves to null when nothing matches, so the row is left out', () => {
			expect(Detail.count('src/pages/**/*.astro')(probing())).toBeNull();
		});
	});

	describe('status', () => {
		it('resolves to the present wording, toned as good, when the path is there', () => {
			const probe = probing({ exists: ['public/storage'] });

			expect(Detail.status('public/storage', 'LINKED', 'NOT LINKED')(probe)).toEqual({
				value: 'LINKED',
				tone: 'good',
			});
		});

		it('resolves to the absent wording, toned as a warning, when the path is missing', () => {
			expect(Detail.status('public/storage', 'LINKED', 'NOT LINKED')(probing())).toEqual({
				value: 'NOT LINKED',
				tone: 'warn',
			});
		});
	});

	describe('literal', () => {
		it('resolves to the text it was given', () => {
			expect(Detail.literal('en, es, fr')(probing())).toBe('en, es, fr');
		});
	});
});

describe('inspect', () => {
	const astro: Profile = {
		section: 'Astro',
		when: Detail.version('astro'),
		details: {
			Version: Detail.version('astro'),
			Pages: Detail.count('src/pages/**/*.astro'),
		},
	};

	describe('matching', () => {
		it('keeps a profile whose condition is met and resolves its details', () => {
			const probe = probing({
				installed: { astro: '6.4.2' },
				counts: { 'src/pages/**/*.astro': 24 },
			});

			expect(inspect([astro], probe)).toEqual([
				{
					section: 'Astro',
					entries: [
						{ label: 'Version', value: '6.4.2' },
						{ label: 'Pages', value: '24' },
					],
				},
			]);
		});

		it('leaves out a profile whose condition is not met', () => {
			expect(inspect([astro], probing())).toEqual([]);
		});

		it('leaves out a profile that matches but has nothing left to show', () => {
			const profile: Profile = {
				section: 'Astro',
				when: Detail.version('astro'),
				details: { Pages: Detail.count('src/pages/**/*.astro') },
			};
			const probe = probing({ installed: { astro: '6.4.2' } });

			expect(inspect([profile], probe)).toEqual([]);
		});

		it('keeps the profiles in the order they were given', () => {
			const tailwind: Profile = {
				section: 'Tailwind',
				when: Detail.version('tailwindcss'),
				details: { Version: Detail.version('tailwindcss') },
			};
			const probe = probing({ installed: { astro: '6.4.2', tailwindcss: '4.1.0' } });

			expect(inspect([astro, tailwind], probe).map((report) => report.section)).toEqual([
				'Astro',
				'Tailwind',
			]);
		});
	});

	describe('resolving', () => {
		it('leaves out the rows that resolve to nothing, keeping the rest', () => {
			const probe = probing({ installed: { astro: '6.4.2' } });

			expect(inspect([astro], probe)).toEqual([
				{ section: 'Astro', entries: [{ label: 'Version', value: '6.4.2' }] },
			]);
		});

		it('leaves out a row whose value resolves to an empty string', () => {
			const profile: Profile = {
				section: 'Astro',
				when: Detail.version('astro'),
				details: { Version: Detail.version('astro'), Locales: Detail.literal('') },
			};
			const probe = probing({ installed: { astro: '6.4.2' } });

			expect(inspect([profile], probe)).toEqual([
				{ section: 'Astro', entries: [{ label: 'Version', value: '6.4.2' }] },
			]);
		});

		it('carries the tone of a row through to the entry', () => {
			const profile: Profile = {
				section: 'Laravel',
				when: Detail.version('laravel/framework'),
				details: { 'public/storage': Detail.status('public/storage', 'LINKED', 'NOT LINKED') },
			};
			const probe = probing({ installed: { 'laravel/framework': '13.16.1' } });

			expect(inspect([profile], probe)).toEqual([
				{
					section: 'Laravel',
					entries: [{ label: 'public/storage', value: 'NOT LINKED', tone: 'warn' }],
				},
			]);
		});

		it('resolves an inline closure the same as a built-in detail', () => {
			const profile: Profile = {
				section: 'Astro',
				when: Detail.version('astro'),
				details: { Locales: () => ['en', 'fr'].join(', ') },
			};
			const probe = probing({ installed: { astro: '6.4.2' } });

			expect(inspect([profile], probe)).toEqual([
				{ section: 'Astro', entries: [{ label: 'Locales', value: 'en, fr' }] },
			]);
		});

		it('keeps the details in the order the profile declares them', () => {
			const probe = probing({
				installed: { astro: '6.4.2' },
				counts: { 'src/pages/**/*.astro': 24 },
			});

			expect(inspect([astro], probe)[0]?.entries.map((entry) => entry.label)).toEqual([
				'Version',
				'Pages',
			]);
		});
	});
});
