import { describe, expect, it } from 'vitest';
import { detail, leader } from '@/output/detail';

const node = { label: 'Node', value: 'v24.19.0' };

describe('detail', () => {
	it('fills the width with dots between the label and the value', () => {
		expect(detail(node, 40)).toBe(`Node ${'.'.repeat(26)} v24.19.0`);
	});

	it('ends every line of a block at the same column', () => {
		const lines = [detail(node, 40), detail({ label: 'Package manager', value: 'pnpm 11.1.0' }, 40)];

		expect(lines.map((line) => line.length)).toEqual([40, 40]);
	});

	it('draws the shortest leader it is willing to draw', () => {
		expect(detail(node, 17)).toBe('Node ... v24.19.0');
	});

	it('collapses to a colon rather than draw a two dot leader', () => {
		expect(detail(node, 16)).toBe('Node: v24.19.0');
	});

	it('collapses when there is no width to fill', () => {
		expect(detail(node, null)).toBe('Node: v24.19.0');
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

	it('paints the dots', () => {
		expect(detail(node, 20, { dots: (dots) => `<${dots}>` })).toBe('Node <......> v24.19.0');
	});

	it('paints the value', () => {
		expect(detail(node, 20, { value: (value) => `<${value}>` })).toBe(
			'Node ...... <v24.19.0>'
		);
	});

	it('measures the value before it is painted', () => {
		const painted = detail(node, 40, { value: (value) => `\x1b[32;1m${value}\x1b[0m` });

		expect(painted).toBe(`Node ${'.'.repeat(26)} \x1b[32;1mv24.19.0\x1b[0m`);
	});

	it('measures the leader before it is painted', () => {
		const painted = detail(node, 40, { dots: (dots) => `\x1b[2m${dots}\x1b[0m` });

		expect(painted).toBe(`Node \x1b[2m${'.'.repeat(26)}\x1b[0m v24.19.0`);
	});

	it('still paints the value when the leader collapses', () => {
		expect(detail(node, null, { value: (value) => `<${value}>` })).toBe('Node: <v24.19.0>');
	});

	it('does not paint a leader it decided not to draw', () => {
		expect(detail(node, null, { dots: (dots) => `<${dots}>` })).toBe('Node: v24.19.0');
	});
});

describe('leader', () => {
	it('runs dots from the label to the width', () => {
		expect(leader('Runtime', 37)).toBe(`Runtime ${'.'.repeat(29)}`);
	});

	it('fills the width exactly', () => {
		expect(leader('Runtime', 37)).toHaveLength(37);
	});

	it('leaves the label alone when there is no width to fill', () => {
		expect(leader('Runtime', null)).toBe('Runtime');
	});

	it('leaves the label alone rather than draw a two dot leader', () => {
		expect(leader('Runtime', 10)).toBe('Runtime');
	});

	it('draws the shortest leader it is willing to draw', () => {
		expect(leader('Runtime', 11)).toBe('Runtime ...');
	});

	it('paints the label and the dots apart', () => {
		const painted = leader('Runtime', 20, {
			label: (text) => `<${text}>`,
			dots: (dots) => `[${dots}]`,
		});

		expect(painted).toBe('<Runtime> [............]');
	});

	it('measures before painting', () => {
		const painted = leader('Runtime', 20, { label: (text) => `\x1b[32;1m${text}\x1b[0m` });

		expect(painted).toBe(`\x1b[32;1mRuntime\x1b[0m ${'.'.repeat(12)}`);
	});

	it('paints a label it drew no leader for', () => {
		expect(leader('Runtime', null, { label: (text) => `<${text}>` })).toBe('<Runtime>');
	});
});
