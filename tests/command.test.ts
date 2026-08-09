import { describe, expect, it } from 'vitest';
import { Command, Terminal, flag, maybe, number, option, type Sinks } from '@';

class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello';

	readonly arguments = {
		first: maybe('First thing'),
		second: maybe('Second thing'),
	};

	readonly options = {
		name: option('world', 'Who to greet'),
		times: number(1, 'How many times'),
		loud: flag('Shout it'),
	};

	seen: { name: string; times: number; loud: boolean; first?: string; second?: string } | null =
		null;

	handle(): number {
		this.seen = {
			name: this.option('name'),
			times: this.option('times'),
			loud: this.option('loud'),
			first: this.argument('first'),
			second: this.argument('second'),
		};

		return Command.SUCCESS;
	}
}

class NoisyCommand extends Command {
	readonly name = 'noisy';
	readonly description = 'Writes to every sink';

	handle(): number {
		this.line('line')
			.info('info')
			.comment('comment')
			.warn('warn')
			.error('error')
			.newLine()
			.sections([{ title: 'Section', lines: ['first'] }]);

		return Command.FAILURE;
	}
}

class WhereCommand extends Command {
	readonly name = 'where';
	readonly description = 'Reports its context';

	handle(): number {
		this.line(`${this.cwd} ${this.project}`);

		return Command.SUCCESS;
	}
}

function recorder() {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
	};

	return { out, err, terminal: new Terminal(sinks) };
}

describe('exit codes', () => {
	it('distinguishes success, failure and invalid', () => {
		expect([Command.SUCCESS, Command.FAILURE, Command.INVALID]).toEqual([0, 1, 2]);
	});
});

describe('run', () => {
	it('returns whatever handle returns', async () => {
		const { terminal } = recorder();

		expect(await new NoisyCommand().run(terminal, [])).toBe(Command.FAILURE);
	});

	it('writes nothing before it is run', () => {
		const { out, err } = recorder();

		new NoisyCommand();

		expect(out).toEqual([]);
		expect(err).toEqual([]);
	});
});

describe('option', () => {
	it('falls back to the declared default', async () => {
		const { terminal } = recorder();
		const command = new GreetCommand();

		await command.run(terminal, []);

		expect(command.seen).toMatchObject({ name: 'world', times: 1, loud: false });
	});

	it('takes the parsed value', async () => {
		const { terminal } = recorder();
		const command = new GreetCommand();

		await command.run(terminal, ['--name=Mathieu', '--times=3', '--loud']);

		expect(command.seen).toMatchObject({ name: 'Mathieu', times: 3, loud: true });
	});
});

describe('argument', () => {
	it('reads positionals by name', async () => {
		const { terminal } = recorder();
		const command = new GreetCommand();

		await command.run(terminal, ['one', 'two']);

		expect(command.seen).toMatchObject({ first: 'one', second: 'two' });
	});

	it('is undefined when the positional is absent', async () => {
		const { terminal } = recorder();
		const command = new GreetCommand();

		await command.run(terminal, []);

		expect(command.seen?.first).toBeUndefined();
	});
});

describe('context', () => {
	it('exposes the cwd and project it was run with', async () => {
		const { out, terminal } = recorder();

		await new WhereCommand().run(terminal, [], { cwd: '/work/site/src', project: '/work/site' });

		expect(out).toEqual(['/work/site/src /work/site\n']);
	});

	it('falls back to the process cwd and no project', async () => {
		const { out, terminal } = recorder();

		await new WhereCommand().run(terminal, []);

		expect(out).toEqual([`${process.cwd()} null\n`]);
	});
});

describe('output', () => {
	it('sends plain, informational and commented text to stdout', async () => {
		const { out, terminal } = recorder();
		await new NoisyCommand().run(terminal, []);

		expect(out.slice(0, 3)).toEqual(['line\n', 'info\n', 'comment\n']);
	});

	it('sends warnings and errors to stderr', async () => {
		const { err, terminal } = recorder();
		await new NoisyCommand().run(terminal, []);

		expect(err).toEqual(['warn\n', 'error\n']);
	});

	it('renders sections', async () => {
		const { out, terminal } = recorder();
		await new NoisyCommand().run(terminal, []);

		expect(out.join('')).toContain('Section:');
		expect(out.join('')).toContain('  first');
	});

	it('writes a detail row to stdout', async () => {
		const { out, terminal } = recorder();

		class ReportingCommand extends Command {
			readonly name = 'reporting';
			readonly description = 'Writes a detail row';

			handle(): number {
				this.detail('Node', 'v24.19.0');

				return Command.SUCCESS;
			}
		}

		await new ReportingCommand().run(terminal, []);

		expect(out).toEqual(['Node: v24.19.0\n']);
	});

	it('writes a heading and its rows', async () => {
		const { out, terminal } = recorder();

		class ReportingCommand extends Command {
			readonly name = 'reporting';
			readonly description = 'Writes a group of detail rows';

			handle(): number {
				this.details('Runtime', [{ label: 'Node', value: 'v24.19.0' }]);

				return Command.SUCCESS;
			}
		}

		await new ReportingCommand().run(terminal, []);

		expect(out).toEqual(['  Runtime\n', '  Node: v24.19.0\n']);
	});

	it('chains from a detail row', async () => {
		const { out, terminal } = recorder();

		class ReportingCommand extends Command {
			readonly name = 'reporting';
			readonly description = 'Writes two detail rows';

			handle(): number {
				this.detail('Node', 'v24.19.0').detail('Package manager', 'pnpm 11.1.0');

				return Command.SUCCESS;
			}
		}

		await new ReportingCommand().run(terminal, []);

		expect(out).toEqual(['Node: v24.19.0\n', 'Package manager: pnpm 11.1.0\n']);
	});
});

describe('spin', () => {
	it('returns the value the task produced', async () => {
		const { terminal } = recorder();

		class SpinningCommand extends Command {
			readonly name = 'spinning';
			readonly description = 'Runs a task';

			result = '';

			async handle(): Promise<number> {
				this.result = await this.spin('Working', () => 'done');

				return Command.SUCCESS;
			}
		}

		const command = new SpinningCommand();
		await command.run(terminal, []);

		expect(command.result).toBe('done');
	});
});

describe('progress', () => {
	it('hands back a bar sized to the total', async () => {
		const { terminal } = recorder();

		class CountingCommand extends Command {
			readonly name = 'counting';
			readonly description = 'Counts';

			total = 0;
			completed = 0;

			handle(): number {
				const bar = this.progress(3);
				bar.advance().advance();

				this.total = bar.total;
				this.completed = bar.completed;

				return Command.SUCCESS;
			}
		}

		const command = new CountingCommand();
		await command.run(terminal, []);

		expect(command.total).toBe(3);
		expect(command.completed).toBe(2);
	});
});
