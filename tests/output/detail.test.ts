import { describe, expect, it } from 'vitest';
import { detail } from '@/output/detail';

describe('detail', () => {
	it('fills the width with dots between the label and the value', () => {
		const line = detail({ label: 'Node', value: 'v24.19.0' }, 40);

		expect(line).toBe(`Node ${'.'.repeat(26)} v24.19.0`);
	});

	it('ends every line of a block at the same column', () => {
		const lines = [
			detail({ label: 'Node', value: 'v24.19.0' }, 40),
			detail({ label: 'Package manager', value: 'pnpm 11.1.0' }, 40),
		];

		expect(lines.map((line) => line.length)).toEqual([40, 40]);
	});

	it('draws the shortest leader it is willing to draw', () => {
		expect(detail({ label: 'Node', value: 'v24.19.0' }, 17)).toBe('Node ... v24.19.0');
	});

	it('collapses to a colon rather than draw a two dot leader', () => {
		expect(detail({ label: 'Node', value: 'v24.19.0' }, 16)).toBe('Node: v24.19.0');
	});

	it('collapses when there is no width to fill', () => {
		expect(detail({ label: 'Node', value: 'v24.19.0' }, null)).toBe('Node: v24.19.0');
	});

	it('collapses rather than truncate a value wider than the width', () => {
		expect(detail({ label: 'Framework', value: 'astro 6.4.0' }, 8)).toBe('Framework: astro 6.4.0');
	});

	it('drops the leader entirely when there is no value', () => {
		expect(detail({ label: 'Shadowed', value: '' }, 40)).toBe('Shadowed');
	});

	it('leaves a label alone when there is no value and no width', () => {
		expect(detail({ label: 'Shadowed', value: '' }, null)).toBe('Shadowed');
	});

	it('paints the dots and nothing else', () => {
		const line = detail({ label: 'Node', value: 'v24.19.0' }, 20, (dots) => `<${dots}>`);

		expect(line).toBe('Node <......> v24.19.0');
	});

	it('measures the leader before it is painted', () => {
		const painted = detail({ label: 'Node', value: 'v24.19.0' }, 40, (dots) => `\x1b[2m${dots}\x1b[0m`);
		const plain = detail({ label: 'Node', value: 'v24.19.0' }, 40);

		expect(painted).toBe(`Node \x1b[2m${'.'.repeat(26)}\x1b[0m v24.19.0`);
		expect(plain).toHaveLength(40);
	});

	it('does not paint a leader it decided not to draw', () => {
		expect(detail({ label: 'Node', value: 'v24.19.0' }, null, (dots) => `<${dots}>`)).toBe(
			'Node: v24.19.0'
		);
	});
});
