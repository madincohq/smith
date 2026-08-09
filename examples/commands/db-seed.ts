import { Command, maybe, flag } from '@madinco/smith';

export class DbSeedCommand extends Command {
	readonly name = 'db:seed';
	readonly description = 'Run the database seeders';

	readonly arguments = {
		seeder: maybe('Run only this seeder, rather than all of them'),
	};

	readonly options = {
		fresh: flag('Drop every table first'),
	};

	handle(): number {
		const seeder = this.argument('seeder') ?? everySeeder();

		this.detail('Seeding', seeder);

		if (this.option('fresh')) this.comment('Every table would be dropped first.');

		return Command.SUCCESS;
	}
}

function everySeeder(): string {
	return 'all seeders';
}
