import { Command, Directory, Files, Stubs, argument, maybe, option } from '@madinco/smith';

const VALID_NAME = /^[a-z][a-z0-9-]*$/;

export class WorkspaceCreateCommand extends Command {
	readonly name = 'workspace:create';
	readonly description = 'Create a small project in the playground workspace';

	readonly arguments = {
		name: argument('Name of the project to create'),
	};

	readonly options = {
		description: option('A local playground project', 'Project description'),
	};

	handle(): number {
		const name = this.argument('name');

		if (!VALID_NAME.test(name)) {
			this.error('Use a lowercase name containing letters, numbers, and hyphens.');

			return Command.INVALID;
		}

		const project = new Directory(this.cwd).directory('playground/workspace/projects').directory(name);

		if (project.exists()) {
			this.error(`${name} already exists.`);

			return Command.FAILURE;
		}

		project.ensure();
		Files.write([
			{
				path: project.file('project.json').path,
				contents: Stubs.render(Stubs.read('project', new URL('../stubs/', import.meta.url)), {
					name: JSON.stringify(name),
					description: JSON.stringify(this.option('description')),
				}),
			},
			{
				path: project.file('src/main.ts').path,
				contents: `export const name = '${name}';\n`,
			},
		]);

		this.info(`Created ${name}.`).detail('Path', project.path);

		return Command.SUCCESS;
	}
}

export class WorkspaceInspectCommand extends Command {
	readonly name = 'workspace:inspect';
	readonly description = 'Read a project from the playground workspace';

	readonly arguments = {
		name: maybe('Project name; defaults to the current project'),
	};

	handle(): number {
		const name = this.argument('name');

		if (name !== undefined && !VALID_NAME.test(name)) {
			this.error('Use a lowercase name containing letters, numbers, and hyphens.');

			return Command.INVALID;
		}

		const workspace = new Directory(this.cwd).directory('playground/workspace');
		const current = workspace.symlink('current');

		if (name === undefined && (!current.exists() || current.isBroken())) {
			this.error('No current project. Run workspace:link first or pass a project name.');

			return Command.FAILURE;
		}

		const project = name === undefined
			? new Directory(current.targetPath())
			: workspace.directory('projects').directory(name);
		const manifest = project.file('project.json');

		if (!manifest.exists()) {
			this.error(`${project.name} does not exist. Create it with workspace:create first.`);

			return Command.FAILURE;
		}

		const { name: projectName, description } = JSON.parse(manifest.read()) as {
			name: string;
			description: string;
		};

		this.details('Workspace project', [
			{ label: 'Name', value: projectName },
			{ label: 'Description', value: description },
			{ label: 'Entry', value: project.file('src/main.ts').path },
		]);

		return Command.SUCCESS;
	}
}

export class WorkspaceLinkCommand extends Command {
	readonly name = 'workspace:link';
	readonly description = 'Link a playground project as the current workspace';

	readonly arguments = {
		name: argument('Name of the project to link'),
	};

	handle(): number {
		const name = this.argument('name');

		if (!VALID_NAME.test(name)) {
			this.error('Use a lowercase name containing letters, numbers, and hyphens.');

			return Command.INVALID;
		}

		const workspace = new Directory(this.cwd).directory('playground/workspace');
		const project = workspace.directory('projects').directory(name);

		if (!project.exists()) {
			this.error(`${project.name} does not exist. Create it with workspace:create first.`);

			return Command.FAILURE;
		}

		const link = workspace.symlink('current').to(project);
		const manifest = workspace.symlink('current.json').to(project.file('project.json'));

		this.info(`Linked ${project.name}.`)
			.detail('Project', link.path)
			.detail('Manifest', manifest.path);

		return Command.SUCCESS;
	}
}
