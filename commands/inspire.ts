import { Command } from '@madinco/smith';

const QUOTES = [
	'When there is no desire, all things are at peace. - Laozi',
	'Simplicity is the ultimate sophistication. - Leonardo da Vinci',
	'Well begun is half done. - Aristotle',
	'He who is contented is rich. - Laozi',
	'Very little is needed to make a happy life. - Marcus Aurelius',
	'It is quality rather than quantity that matters. - Seneca',
	'No great thing is created suddenly. - Epictetus',
];

export class InspireCommand extends Command {
	readonly name = 'inspire';
	readonly description = 'Display an inspiring quote';

	handle(): number {
		this.comment(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

		return Command.SUCCESS;
	}
}
