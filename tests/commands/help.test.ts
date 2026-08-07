import { describe, expect, it } from 'vitest';
import { Command, Terminal, flag, option, type Sinks } from '@';
import { HelpCommand } from '@/commands/help';

class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello';

	readonly options = {
		name: option('world', 'Who to greet'),
		loud: flag('Shout it', 'l'),
	};

	handle(): number {
		return Command.SUCCESS;
	}
}

class BuildCommand extends Command {
	readonly name = 'build';
	readonly description = 'Build the site';

	handle(): number {
		return Command.SUCCESS;
	}
}

function harness() {
	const out: string[] = [];
	const err: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: (text) => void err.push(text),
		columns: () => 80,
		decorated: false,
		interactive: false,
	};

	const registry = new Map<string, Command>([
		['greet', new GreetCommand()],
		['build', new BuildCommand()],
	]);

	return { out, err, terminal: new Terminal(sinks), command: new HelpCommand(registry) };
}

describe('handle', () => {
	it('lists every command when given no name', async () => {
		const { out, terminal, command } = harness();

		expect(await command.run(terminal, [])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('greet');
		expect(out.join('')).toContain('build');
	});

	it('describes the named command', async () => {
		const { out, terminal, command } = harness();

		expect(await command.run(terminal, ['greet'])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('Say hello');
	});

	it('shows the options that command declares', async () => {
		const { out, terminal, command } = harness();
		await command.run(terminal, ['greet']);

		expect(out.join('')).toContain('--name[=NAME]');
		expect(out.join('')).toContain('-l, --loud');
	});

	it('shows only the named command', async () => {
		const { out, terminal, command } = harness();
		await command.run(terminal, ['greet']);

		expect(out.join('')).not.toContain('Build the site');
	});

	it('omits the options section for a command that declares none', async () => {
		const { out, terminal, command } = harness();
		await command.run(terminal, ['build']);

		expect(out.join('')).toContain('Build the site');
		expect(out.join('')).not.toContain('Options:');
	});

	it('reports an unknown name and returns the invalid code', async () => {
		const { err, terminal, command } = harness();

		expect(await command.run(terminal, ['nope'])).toBe(Command.INVALID);
		expect(err.join('')).toContain('Unknown command "nope"');
	});
});
