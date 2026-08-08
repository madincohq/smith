import { describe, expect, it } from 'vitest';
import { Command, Terminal, type Sinks } from '@';
import { ListCommand } from '@/commands/list';

class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello';

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

function harness(...commands: Command[]) {
	const out: string[] = [];

	const sinks: Sinks = {
		out: (text) => void out.push(text),
		err: () => {},
	};

	const registry = new Map(commands.map((command) => [command.name, command]));

	return { out, terminal: new Terminal(sinks), command: new ListCommand(registry) };
}

describe('handle', () => {
	it('names every registered command', async () => {
		const { out, terminal, command } = harness(new GreetCommand(), new BuildCommand());

		expect(await command.run(terminal, [])).toBe(Command.SUCCESS);
		expect(out.join('')).toContain('greet');
		expect(out.join('')).toContain('build');
	});

	it('describes each one', async () => {
		const { out, terminal, command } = harness(new GreetCommand());
		await command.run(terminal, []);

		expect(out.join('')).toContain('Say hello');
	});

	it('sorts them by name', async () => {
		const { out, terminal, command } = harness(new GreetCommand(), new BuildCommand());
		await command.run(terminal, []);

		const text = out.join('');

		expect(text.indexOf('build')).toBeLessThan(text.indexOf('greet'));
	});

	it('shows how to invoke the binary', async () => {
		const { out, terminal, command } = harness(new GreetCommand());
		await command.run(terminal, []);

		expect(out.join('')).toContain('smith <command> [options]');
	});

	it('survives an empty registry', async () => {
		const { terminal, command } = harness();

		expect(await command.run(terminal, [])).toBe(Command.SUCCESS);
	});
});
