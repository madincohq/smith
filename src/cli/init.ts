import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Command } from '../command.js';
import { flag } from '../options.js';
import { target, type Location } from './resolve.js';

const SHIM = `#!/usr/bin/env node
import '@madinco/smith/bin';
`;

export class InitCommand extends Command {
	readonly name = 'init';
	readonly description = 'Create the directories smith looks in';

	readonly options = {
		global: flag('Set up the global command directory, ignoring any project here', 'g'),
		shim: flag('Also write a ./smith launcher in the project'),
	};

	constructor(private readonly location: Location) {
		super();
	}

	handle(): number {
		const global = this.option('global') || this.location.project === null;
		const directory = global ? this.location.global : target(this.location);

		this.prepare(directory);

		if (!global && this.option('shim')) this.launcher();

		this.newLine().comment('Add a command with "smith make:command <name>".');

		return Command.SUCCESS;
	}

	private prepare(directory: string): void {
		if (existsSync(directory)) {
			this.comment(`${directory} already exists.`);
			return;
		}

		mkdirSync(directory, { recursive: true });
		this.info(`Created ${directory}`);
	}

	private launcher(): void {
		const project = this.location.project;

		if (project === null) return;

		if (!project.module) {
			this.warn('Skipped ./smith: the project is not "type": "module". Use "pnpm exec smith".');
			return;
		}

		const path = join(project.root, 'smith');

		if (existsSync(path)) {
			this.comment(`${relative(this.cwd, path)} already exists.`);
			return;
		}

		writeFileSync(path, SHIM, { mode: 0o755 });
		this.info(`Created ${relative(this.cwd, path)}, so "node smith" works here.`);
	}
}
