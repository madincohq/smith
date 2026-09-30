import { Command, Directory, Files, Stubs, argument, flag, option } from '@madinco/smith';

const VALID_NAME = /^[a-z][a-z0-9-]*$/;

export class WorkspaceConfigureCommand extends Command {
	readonly name = 'workspace:configure';
	readonly description = 'Change a playground project description';

	readonly arguments = {
		name: argument('Project name'),
	};

	readonly options = {
		description: option('', 'New description; prompts when omitted'),
		yes: flag('Save without confirmation'),
	};

	async handle(): Promise<number> {
		const name = this.argument('name');

		if (!VALID_NAME.test(name)) {
			this.error('Use a lowercase name containing letters, numbers, and hyphens.');

			return Command.INVALID;
		}

		const manifest = new Directory(this.cwd)
			.directory('playground/workspace/projects')
			.directory(name)
			.file('project.json');

		if (!manifest.exists()) {
			this.error(`${name} does not exist. Create it with workspace:create first.`);

			return Command.FAILURE;
		}

		const previous = JSON.parse(manifest.read()) as { name: string; description: string };
		const description = this.option('description') || await this.ask('Description?', previous.description);

		if (description === previous.description) {
			this.comment('The description is already current.');

			return Command.SUCCESS;
		}

		this.detail('Project', name).detail('Description', description);

		if (!this.option('yes') && !await this.confirm('Save this description?')) {
			this.comment('No changes saved.');

			return Command.SUCCESS;
		}

		await this.spin('Saving project', () => Files.write([{
			path: manifest.path,
			contents: Stubs.render(Stubs.read('project', new URL('../stubs/', import.meta.url)), {
				name: JSON.stringify(previous.name),
				description: JSON.stringify(description),
			}),
		}]));

		this.info(`Updated ${name}.`);

		return Command.SUCCESS;
	}
}
