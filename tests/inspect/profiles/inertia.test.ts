import { describe, expect, it } from 'vitest';
import { inspect } from '@/inspect/detail';
import type { Inspector } from '@/inspect/probe';
import { inertia } from '@/inspect/profiles/inertia';

interface Setup {
	dependencies?: Record<string, string>;
	installed?: Record<string, string>;
}

function probing(setup: Setup = {}): Inspector {
	return {
		text: () => null,
		json: <T>(path: string) =>
			path === 'package.json' ? ({ dependencies: setup.dependencies ?? {} } as T) : null,
		exists: () => false,
		files: () => [],
		count: () => 0,
		installed: (name: string) => setup.installed?.[name] ?? null,
	};
}

function entries(setup: Setup): Record<string, string> {
	const report = inspect([inertia], probing(setup))[0];

	return Object.fromEntries((report?.entries ?? []).map((entry) => [entry.label, entry.value]));
}

describe('inertia', () => {
	describe('matching', () => {
		it('reports a section for a laravel project using inertia', () => {
			const probe = probing({ installed: { 'inertiajs/inertia-laravel': '2.1.0' } });

			expect(inspect([inertia], probe)[0]?.section).toBe('Inertia');
		});

		it('reports a section when only the client adapter is installed', () => {
			const probe = probing({ dependencies: { '@inertiajs/react': '^2.0.0' } });

			expect(inspect([inertia], probe)[0]?.section).toBe('Inertia');
		});

		it('reports nothing for a project that does not use inertia', () => {
			expect(inspect([inertia], probing())).toEqual([]);
		});
	});

	describe('details', () => {
		it('reports the version of the laravel adapter when there is one', () => {
			const setup = {
				installed: { 'inertiajs/inertia-laravel': '2.1.0', '@inertiajs/react': '2.0.5' },
				dependencies: { '@inertiajs/react': '^2.0.0' },
			};

			expect(entries(setup)).toEqual({ Version: '2.1.0', Adapter: '@inertiajs/react' });
		});

		it('falls back to the client version when the project has no php side', () => {
			const setup = {
				installed: { '@inertiajs/vue3': '2.0.5' },
				dependencies: { '@inertiajs/vue3': '^2.0.0' },
			};

			expect(entries(setup).Version).toBe('2.0.5');
		});

		it('names the client adapter the project renders with', () => {
			const setup = { dependencies: { '@inertiajs/svelte': '^2.0.0' } };

			expect(entries(setup).Adapter).toBe('@inertiajs/svelte');
		});

		it('does not mistake the inertia core package for an adapter', () => {
			const setup = {
				installed: { 'inertiajs/inertia-laravel': '2.1.0' },
				dependencies: { '@inertiajs/core': '^2.0.0' },
			};

			expect(entries(setup)).not.toHaveProperty('Adapter');
		});
	});
});
