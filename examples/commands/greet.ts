import { Command, argument, flag } from '@madinco/smith';

export class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello to someone';

	readonly arguments = {
		name: argument('Who to greet'),
	};

	readonly options = {
		loud: flag('Shout it'),
	};

	handle(): number {
		const greeting = `Hello, ${this.argument('name')}`;

		this.info(this.option('loud') ? greeting.toUpperCase() : greeting);

		return Command.SUCCESS;
	}
}
