import { Command, flag, option } from '@madinco/smith';

export class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello';

	readonly options = {
		name: option('world', 'Who to greet', 'n'),
		loud: flag('Shout it'),
	};

	handle(): number {
		const greeting = `Hello, ${this.option('name')}`;

		this.info(this.option('loud') ? greeting.toUpperCase() : greeting);

		return Command.SUCCESS;
	}
}
