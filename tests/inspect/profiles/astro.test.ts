import { describe, expect, it } from 'vitest';
import { inspect } from '@/inspect/detail';
import type { Inspector } from '@/inspect/probe';
import { astro } from '@/inspect/profiles/astro';

interface Setup {
	dependencies?: Record<string, string>;
	counts?: Record<string, number>;
	installed?: Record<string, string>;
}

function probing(setup: Setup = {}): Inspector {
	return {
		text: () => null,
		json: <T>(path: string) =>
			path === 'package.json' ? ({ dependencies: setup.dependencies ?? {} } as T) : null,
		exists: () => false,
		files: () => [],
		count: (pattern: string) => setup.counts?.[pattern] ?? 0,
		installed: (name: string) => setup.installed?.[name] ?? null,
	};
}

describe('astro', () => {
	describe('matching', () => {
		it('reports a section when astro is installed', () => {
			const probe = probing({ installed: { astro: '6.4.6' } });

			expect(inspect([astro], probe)[0]?.section).toBe('Astro');
		});

		it('reports nothing when astro is not installed', () => {
			expect(inspect([astro], probing())).toEqual([]);
		});
	});

	describe('details', () => {
		it('reports the installed version and the files it finds', () => {
			const probe = probing({
				installed: { astro: '6.4.6' },
				counts: {
					'src/pages/**/*.{astro,md,mdx}': 109,
					'src/components/**/*.astro': 152,
					'src/content/**/*.{md,mdx}': 196,
				},
			});

			expect(inspect([astro], probe)[0]?.entries).toEqual([
				{ label: 'Version', value: '6.4.6' },
				{ label: 'Pages', value: '109' },
				{ label: 'Components', value: '152' },
				{ label: 'Content', value: '196' },
			]);
		});

		it('names the adapter in use', () => {
			const probe = probing({
				installed: { astro: '6.4.6' },
				dependencies: { '@astrojs/cloudflare': '^13.1.9' },
			});

			expect(inspect([astro], probe)[0]?.entries).toContainEqual({
				label: 'Adapter',
				value: '@astrojs/cloudflare',
			});
		});

		it('does not mistake another astro integration for the adapter', () => {
			const probe = probing({
				installed: { astro: '6.4.6' },
				dependencies: { '@astrojs/mdx': '^6.0.3', '@astrojs/rss': '^4.0.18' },
			});

			expect(inspect([astro], probe)[0]?.entries.map((entry) => entry.label)).not.toContain(
				'Adapter'
			);
		});

		it('leaves out the counts that find nothing', () => {
			const probe = probing({ installed: { astro: '6.4.6' } });

			expect(inspect([astro], probe)[0]?.entries).toEqual([
				{ label: 'Version', value: '6.4.6' },
			]);
		});
	});
});
