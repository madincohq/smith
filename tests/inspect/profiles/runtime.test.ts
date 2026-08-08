import { describe, expect, it } from 'vitest';
import { inspect } from '@/inspect/detail';
import type { Inspector } from '@/inspect/probe';
import { runtime } from '@/inspect/profiles/runtime';

interface Setup {
	manifest?: Record<string, unknown>;
	present?: string[];
	installed?: Record<string, string>;
}

function probing(setup: Setup = {}): Inspector {
	return {
		text: () => null,
		json: <T>(path: string) => (path === 'package.json' ? ((setup.manifest ?? {}) as T) : null),
		exists: (path: string) => (setup.present ?? []).includes(path),
		files: () => [],
		count: () => 0,
		installed: (name: string) => setup.installed?.[name] ?? null,
	};
}

function entries(setup: Setup = {}): Record<string, string> {
	const report = inspect([runtime], probing(setup))[0];

	return Object.fromEntries((report?.entries ?? []).map((entry) => [entry.label, entry.value]));
}

describe('runtime', () => {
	it('always reports, whatever the project turns out to be', () => {
		expect(inspect([runtime], probing())[0]?.section).toBe('Runtime');
	});

	it('reports the node version it is running on', () => {
		expect(entries().Node).toBe(process.version);
	});

	describe('package manager', () => {
		it('reports the one the manifest pins, with its version', () => {
			expect(entries({ manifest: { packageManager: 'pnpm@11.1.0' } })['Package manager']).toBe(
				'pnpm 11.1.0'
			);
		});

		it('falls back to whichever lockfile is present', () => {
			expect(entries({ present: ['pnpm-lock.yaml'] })['Package manager']).toBe('pnpm');
			expect(entries({ present: ['package-lock.json'] })['Package manager']).toBe('npm');
			expect(entries({ present: ['yarn.lock'] })['Package manager']).toBe('yarn');
			expect(entries({ present: ['bun.lock'] })['Package manager']).toBe('bun');
		});

		it('says nothing when there is neither a pin nor a lockfile', () => {
			expect(entries()).not.toHaveProperty('Package manager');
		});
	});

});
