import { Collection, Command, Directory, flag, number, rest } from '@madinco/smith';

const VALID_NAME = /^[a-z][a-z0-9-]*$/;

export class WorkspaceCheckCommand extends Command {
	readonly name = 'workspace:check';
	readonly description = 'Check one or more playground projects';

	readonly arguments = {
		names: rest('Project names; checks all projects when omitted'),
	};

	readonly options = {
		minimum: number(1, 'Minimum number of TypeScript entry files'),
		strict: flag('Fail when a project is incomplete'),
	};

	handle(): number {
		const minimum = this.option('minimum');

		if (!Number.isInteger(minimum) || minimum < 1) {
			this.error('--minimum must be a positive integer.');

			return Command.INVALID;
		}

		const projects = new Directory(this.cwd).directory('playground/workspace/projects');
		const requested = this.argument('names');
		const names = requested.length > 0
			? new Collection(requested)
			: projects.folders().get().pluck('name');

		if (names.isEmpty()) {
			this.comment('No projects yet. Run workspace:create first.');

			return Command.SUCCESS;
		}

		if (names.contains((name) => !VALID_NAME.test(name))) {
			this.error('Use lowercase project names containing letters, numbers, and hyphens.');

			return Command.INVALID;
		}

		const progress = this.progress(names.count());
		const lines: string[] = [];
		let failed = false;

		for (const name of names) {
			const project = projects.directory(name);
			const entries = project.directory('src').files().withExtension('ts').count();
			const manifest = project.file('project.json').exists();
			const healthy = manifest && entries >= minimum;

			lines.push(`${name}: ${healthy ? 'ready' : `incomplete (manifest: ${manifest ? 'yes' : 'no'}, TypeScript files: ${entries})`}`);
			if (!healthy) failed = true;
			progress.advance(name);
		}

		progress.finish();
		this.sections([{ title: 'Workspace projects', lines }]);

		return failed && this.option('strict') ? Command.FAILURE : Command.SUCCESS;
	}
}
