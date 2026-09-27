import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '../command.js';
import { flag } from '../options.js';
import { Files } from '../utils/files.js';
import { Find } from '../utils/find.js';
import type { Location, Project } from './resolve.js';

const SHIM = `#!/usr/bin/env node
import('@madinco/smith/bin');
`;

const MANIFEST = `{
  "type": "module",
  "private": true
}
`;

const IGNORE = `node_modules
.env
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
		const { project } = this.location;

		if (this.option('global') || project === null) this.global();
		else this.local(project);

		this.newLine().comment('Add a command with "smith make:command <name>".');

		return Command.SUCCESS;
	}

	private global(): void {
		const { home, global } = this.location;

		this.prepare(global);
		this.seed(join(home, 'package.json'), MANIFEST);
		this.seed(join(home, '.gitignore'), IGNORE);
		this.link(home);
	}

	private local(project: Project): void {
		this.prepare(project.commands);

		if (this.option('shim')) this.launcher(project);
	}

	private prepare(directory: string): void {
		if (existsSync(directory)) {
			this.comment(`${directory} already exists.`);
			return;
		}

		mkdirSync(directory, { recursive: true });
		this.info(`Created ${directory}`);
	}

	private seed(path: string, contents: string): void {
		if (existsSync(path)) return;

		writeFileSync(path, contents);
		this.info(`Created ${path}`);
	}

	private link(home: string): void {
		const { root, name } = self();
		const path = join(home, 'node_modules', name);

		if (existsSync(path)) return;

		mkdirSync(dirname(path), { recursive: true });
		symlinkSync(root, path, 'junction');

		this.info(`Linked ${name}, so commands here can import it`);
	}

	private launcher(project: Project): void {
		const path = join(project.root, 'smith');

		if (existsSync(path)) {
			this.comment(`${relative(this.cwd, path)} already exists.`);
			return;
		}

		writeFileSync(path, SHIM, { mode: 0o755 });
		this.info(`Created ${relative(this.cwd, path)}, so "node smith" works here.`);
	}
}

function self(): { root: string; name: string } {
	const root = Find.nearest(dirname(fileURLToPath(import.meta.url)), (found) => Boolean(nameIn(found.absolute)));

	if (root === null) throw new Error('Could not find the smith package on disk.');

	return { root, name: nameIn(root) as string };
}

function nameIn(directory: string): string | undefined {
	return Files.json<{ name?: string }>(join(directory, 'package.json'))?.name;
}
