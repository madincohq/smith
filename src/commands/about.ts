import { Command } from '../command.js';
import { inspect, type Profile } from '../inspect/detail.js';
import { Probe } from '../inspect/probe.js';
import { astro } from '../inspect/profiles/astro.js';
import { inertia } from '../inspect/profiles/inertia.js';
import { laravel } from '../inspect/profiles/laravel.js';
import { project } from '../inspect/profiles/project.js';
import { runtime } from '../inspect/profiles/runtime.js';

const PROFILES: Profile[] = [runtime, project, laravel, inertia, astro];

export class AboutCommand extends Command {
	readonly name = 'about';
	readonly description = 'Display information about this project';

	constructor(private readonly profiles: Profile[] = PROFILES) {
		super();
	}

	handle(): number {
		const reports = inspect(this.profiles, new Probe(this.project ?? this.cwd));

		if (reports.length === 0) {
			this.line('No recognised frameworks in this project.');

			return Command.SUCCESS;
		}

		for (const report of reports) {
			this.newLine().details(report.section, report.entries);
		}

		return Command.SUCCESS;
	}
}
