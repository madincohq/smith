import { describe, expect, it } from 'vitest';
import { Terminal, type Sinks } from '@/output/terminal';

function harness(overrides: Partial<Sinks> = {}) {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
		...overrides,
	};

	return { out, err, terminal: new Terminal(sinks) };
}

describe('line', () => {
	it('writes to stdout with a newline', () => {
		const { out, terminal } = harness();
		terminal.line('44 written');

		expect(out).toEqual(['44 written\n']);
	});

	it('writes a bare newline when given nothing', () => {
		const { out, terminal } = harness();
		terminal.line();

		expect(out).toEqual(['\n']);
	});
});

describe('error', () => {
	it('writes to stderr, not stdout', () => {
		const { out, err, terminal } = harness();
		terminal.error('no dev server');

		expect(err).toEqual(['no dev server\n']);
		expect(out).toEqual([]);
	});
});

describe('warn', () => {
	it('writes to stderr', () => {
		const { out, err, terminal } = harness();
		terminal.warn('cache is stale');

		expect(err).toEqual(['cache is stale\n']);
		expect(out).toEqual([]);
	});
});

describe('newLine', () => {
	it('writes the requested number of blank lines', () => {
		const { out, terminal } = harness();
		terminal.newLine(2);

		expect(out).toEqual(['\n\n']);
	});
});

describe('decorated', () => {
	it('leaves output plain when the sink is undecorated', () => {
		const { out, terminal } = harness();
		terminal.info('done');

		expect(out).toEqual(['done\n']);
	});

	it('wraps output in color when the sink is decorated', () => {
		const { out, err, terminal } = harness({ decorated: true });
		terminal.info('done');
		terminal.error('boom');

		expect(out).toEqual(['\x1b[32mdone\x1b[0m\n']);
		expect(err).toEqual(['\x1b[31mboom\x1b[0m\n']);
	});

	it('does not color an empty line', () => {
		const { out, terminal } = harness({ decorated: true });
		terminal.info();

		expect(out).toEqual(['\n']);
	});
});

describe('detail', () => {
	it('fills the terminal width, one column short of wrapping', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true });
		terminal.detail('Node', 'v24.19.0');

		expect(out).toEqual([`Node ${'.'.repeat(25)} v24.19.0\n`]);
	});

	it('dims the dots when the sink is decorated', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true, decorated: true });
		terminal.detail('Node', 'v24.19.0');

		expect(out).toEqual([`Node \x1b[2m${'.'.repeat(25)}\x1b[0m v24.19.0\n`]);
	});

	it('collapses when the sink is not aligned', () => {
		const { out, terminal } = harness({ columns: () => 40 });
		terminal.detail('Node', 'v24.19.0');

		expect(out).toEqual(['Node: v24.19.0\n']);
	});

	it('writes to stdout', () => {
		const { err, terminal } = harness({ aligned: true });
		terminal.detail('Node', 'v24.19.0');

		expect(err).toEqual([]);
	});

	it('falls back to a default width when the terminal reports none', () => {
		const { out, terminal } = harness({ columns: () => 0, aligned: true });
		terminal.detail('Node', 'v24.19.0');

		expect(out).toEqual([`Node ${'.'.repeat(65)} v24.19.0\n`]);
	});
});

describe('details', () => {
	const node = { label: 'Node', value: 'v24.19.0' };

	it('gives the heading its own leader, indented', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true });
		terminal.details('Runtime', []);

		expect(out).toEqual([`  Runtime ${'.'.repeat(29)}\n`]);
	});

	it('indents the rows to match the heading', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true });
		terminal.details('Runtime', [node]);

		expect(out[1]).toBe(`  Node ${'.'.repeat(23)} v24.19.0\n`);
	});

	it('subtracts the indent from the width it fills', () => {
		const { out, terminal } = harness({ columns: () => 20, aligned: true });
		terminal.details('Runtime', [node]);

		expect(out).toEqual([`  Runtime ${'.'.repeat(9)}\n`, `  Node ${'.'.repeat(3)} v24.19.0\n`]);
	});

	it('keeps every line inside a narrow terminal', () => {
		const { out, terminal } = harness({ columns: () => 20, aligned: true });
		terminal.details('Runtime', [node]);

		expect(out.map((line) => line.trimEnd().length)).toEqual([19, 19]);
	});

	it('paints the heading bold green and its dots dim', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true, decorated: true });
		terminal.details('Runtime', []);

		expect(out).toEqual([`  \x1b[32;1mRuntime\x1b[0m \x1b[2m${'.'.repeat(29)}\x1b[0m\n`]);
	});

	it('paints a good value bold green', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true, decorated: true });
		terminal.details('Cache', [{ label: 'Config', value: 'CACHED', tone: 'good' }]);

		expect(out[1]).toContain('\x1b[32;1mCACHED\x1b[0m');
	});

	it('paints a warned value bold yellow', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true, decorated: true });
		terminal.details('Cache', [{ label: 'Config', value: 'NOT CACHED', tone: 'warn' }]);

		expect(out[1]).toContain('\x1b[33;1mNOT CACHED\x1b[0m');
	});

	it('leaves an untoned value plain', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true, decorated: true });
		terminal.details('Runtime', [node]);

		expect(out[1]).toBe(`  Node \x1b[2m${'.'.repeat(23)}\x1b[0m v24.19.0\n`);
	});

	it('measures a toned value before painting it', () => {
		const { out, terminal } = harness({ columns: () => 40, aligned: true, decorated: true });
		terminal.details('Cache', [{ label: 'Config', value: 'CACHED', tone: 'good' }]);

		expect(out[1]).toBe(`  Config \x1b[2m${'.'.repeat(23)}\x1b[0m \x1b[32;1mCACHED\x1b[0m\n`);
	});

	it('drops the leaders but keeps the indent when the sink is not aligned', () => {
		const { out, terminal } = harness({ columns: () => 40 });
		terminal.details('Runtime', [node]);

		expect(out).toEqual(['  Runtime\n', '  Node: v24.19.0\n']);
	});

	it('adds no blank line of its own', () => {
		const { out, terminal } = harness();
		terminal.details('Runtime', [node]);

		expect(out).toHaveLength(2);
	});

	it('renders a heading with no rows', () => {
		const { out, terminal } = harness();
		terminal.details('Runtime', []);

		expect(out).toEqual(['  Runtime\n']);
	});

	it('writes to stdout', () => {
		const { err, terminal } = harness({ aligned: true });
		terminal.details('Runtime', [node]);

		expect(err).toEqual([]);
	});
});

describe('progress', () => {
	it('draws to stderr at the terminal width', () => {
		const { err, terminal } = harness({ columns: () => 40 });
		const bar = terminal.progress(4);

		expect(err).toHaveLength(1);
		bar.advance('concepts/http');
		expect(err[1]).toContain('1/4');
	});
});
