import { describe, expect, it } from 'vitest';
import { inspect } from '@/inspect/detail';
import type { Inspector } from '@/inspect/probe';
import { project } from '@/inspect/profiles/project';

function probing(manifests: Record<string, unknown> = {}): Inspector {
	return {
		text: () => null,
		json: <T>(path: string) => (manifests[path] as T) ?? null,
		exists: (path: string) => path in manifests,
		files: () => [],
		count: () => 0,
		installed: () => null,
	};
}

describe('project', () => {
	it('reports the name and version from package.json', () => {
		const probe = probing({ 'package.json': { name: '@madinco/smith', version: '0.1.0' } });

		expect(inspect([project], probe)).toEqual([
			{
				section: 'Project',
				entries: [
					{ label: 'Name', value: '@madinco/smith' },
					{ label: 'Version', value: '0.1.0' },
				],
			},
		]);
	});

	it('reports a php project from composer.json', () => {
		const probe = probing({ 'composer.json': { name: 'madinco/marclinique' } });

		expect(inspect([project], probe)[0]?.entries).toEqual([
			{ label: 'Name', value: 'madinco/marclinique' },
		]);
	});

	it('prefers package.json when a project has both manifests', () => {
		const probe = probing({
			'package.json': { name: 'madinco.com' },
			'composer.json': { name: 'madinco/site' },
		});

		expect(inspect([project], probe)[0]?.entries).toEqual([
			{ label: 'Name', value: 'madinco.com' },
		]);
	});

	it('reports nothing when there is no manifest to read', () => {
		expect(inspect([project], probing())).toEqual([]);
	});
});
