import { Command, argument, optional, flag } from '@madinco/smith';

export class DeployCommand extends Command {
	readonly name = 'deploy';
	readonly description = 'Ship a branch to an environment';

	readonly arguments = {
		environment: argument('Where to ship it, as in staging or production'),
		branch: optional('main', 'Branch to ship'),
	};

	readonly options = {
		dry: flag('Say what would happen and stop'),
	};

	async handle(): Promise<number> {
		const environment = this.argument('environment');
		const branch = this.argument('branch');

		if (this.option('dry')) {
			this.comment(`Would ship ${branch} to ${environment}.`);

			return Command.SUCCESS;
		}

		await this.spin(`Shipping ${branch} to ${environment}`, () => wait(600));

		this.info('Shipped.');

		return Command.SUCCESS;
	}
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
